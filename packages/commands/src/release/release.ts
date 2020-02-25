import {fileUtils} from '@mixt/utils'
import cli from 'cli'

import Command, {options} from 'command'
import path from 'path'

import buildPackages from 'release/steps/build-packages'
import bumpPackagesVersions from 'release/steps/bump-packages-versions'
import commitReleases from 'release/steps/commit-releases'
import commitRevert from 'release/steps/commit-revert'
import getModifiedPackages from 'release/steps/get-modified-packages'
import releasePackages from 'release/steps/release-packages'
import resolvePackages from 'release/steps/resolve-packages'
import validateRepository from 'release/steps/validate-repository'

/** Helper functions **/
async function apply({ packages }) {
  await Promise.all(packages.map(async (pkg) => {
    if(pkg.src.json.version !== 'Do not release') {
      await fileUtils.saveJson(path.resolve(pkg.src.path, 'package.json'), pkg.src.json)
      await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.dist.json)
    }
  }))
}

async function reload({ packages }) {
  await Promise.all(packages.map(async (pkg) => {
    await pkg.reload()
  }))
}

async function revert({ packages }) {
  await Promise.all(packages.map(async (pkg) => {
    await fileUtils.saveJson(path.resolve(pkg.src.path, 'package.json'), pkg.oldSrcJson)
    await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.oldDistJson)
  }))
}

async function revertResolve({ packages }) {
  cli.info('Reverting version injection...')
  await Promise.all(packages.map(async (pkg) => {
    await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.dist.oldJson)
  }))
}

async function check({ packages, interrupted }) {
  if(interrupted) {
    cli.info('Process was interrupted, restoring packages to old values')
    await revert({ packages })
    process.exit(0)
  }
}

/** Command function **/
export async function command({
  root, allPackages, packages, all,
  build, tag, git, commit,
  quiet, global,
}) {
  let interrupted = false
  process.on('SIGINT', async () => {
    interrupted = true
  })

  // Check repository settings
  const repo = await validateRepository({ root, git })

  // Get a list of modified packages
  const modifiedPackages = await getModifiedPackages({ root, packages, all, commit })

  // Bump versions
  const toReleasePackages = await bumpPackagesVersions({ modifiedPackages })

  // Apply packages update to disk
  await apply({ packages: toReleasePackages })

  // Check if revert is needed
  await check({ packages: toReleasePackages, interrupted })

  // If needed, build all packages
  const allBuilt = await buildPackages({ packages: toReleasePackages, build, quiet, global, allPackages, root })

  // Check if revert is needed
  await check({ packages: toReleasePackages, interrupted: interrupted || !allBuilt })

  // Get built packages
  await reload({ packages: toReleasePackages })

  // Inject dependencies to packages
  const allResolved = await resolvePackages({ packages: toReleasePackages, allPackages, root, global })

  // Apply packages update to disk
  await apply({ packages: toReleasePackages })

  // Check if revert is needed
  await check({ packages: toReleasePackages, interrupted: interrupted || !allResolved })

  // Run release scripts
  const allReleased = await releasePackages({ packages: toReleasePackages, global, quiet })

  // Check if revert is needed
  await check({ packages: toReleasePackages, interrupted: interrupted || !allReleased })

  // Commit release to git
  await commitReleases({ packages: toReleasePackages, repo, git, tag, commit })

  // Check if revert is needed
  await check({ packages: toReleasePackages, interrupted })

  // Revert all packages
  await revertResolve({ packages: toReleasePackages })

  // Commit revert to git
  await commitRevert({ packages: toReleasePackages, repo, git, tag, commit })

  cli.ok("Done!")
}

/** Command export */
export default function ReleaseCommand(program) {
  Command(program, {
    name: 'release [packages...]',
    options: [
      options.all,
      options.noBuild,
      options.noTag,
      options.noCommit,
      options.gitTagPrefix,
      options.gitBranch,
      options.quiet,
      options.resolve,
    ],
    command,
  })
}
