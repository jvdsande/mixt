import cli from 'cli'
import cliAsk from 'inquirer'
import semver from 'semver'
import path from 'path'
import depcheck from 'depcheck'

import {fileUtils, gitUtils, processUtils} from '@mixt/utils'

import Command, {options} from 'command'

import { releaseCommand } from 'shorthands/release'
import { buildCommand } from 'shorthands/build'

import { getStatus } from './status'

/** Helper functions **/
async function bump({ pkg }) {
  const { json } = pkg.src

  const version = json.version || '0.0.0'

  // Check if the current version is a prerelease
  const prerelease = semver.prerelease(version)

  const nextMajor = semver.inc(version, 'major')
  const nextMinor = semver.inc(version, 'minor')
  const nextPatch = semver.inc(version, 'patch')
  let betaMajor = semver.inc(version, 'premajor', 'alpha')
  let betaMinor = semver.inc(version, 'preminor', 'alpha')
  let betaPatch = semver.inc(version, 'prepatch', 'alpha')

  if(prerelease && prerelease.length) {
    const patch = semver.patch(version)
    const minor = semver.minor(version)
    const major = semver.major(version)

    const wasNotPatched = Number(patch) === 0
    const wasNotMinored = Number(minor) === 0

    // Only update the prerelease of patch
    betaPatch = major + '.' + minor + '.' + patch + '-' + prerelease[0] + '.' + (Number(prerelease[1]) + 1)

    // If we were already on a stable major, only update the prerelease of major
    if(wasNotPatched && wasNotMinored) {
      betaMajor = betaPatch
    }

    // If we were on a stable minor, only update the prerelease of minor
    if(wasNotPatched && wasNotMinored) {
      betaMinor = betaPatch
    }
  }

  const privateMsg = `\n(${json.name} is private and will not be published to NPM)`

  let nextVersion = await cliAsk.prompt([{
    name: 'version',
    type: 'list',
    message: `Select the new version for "${json.name}" (current version: ${version}) ${json.private ? privateMsg : ''}`,
    default: 0,
    choices: [nextPatch, nextMinor, nextMajor, 'Custom', betaPatch, betaMinor, betaMajor, 'Do not release'],
    pageSize: 10,
  }])

  while(nextVersion.version === 'Custom') {
    const customVersion = await cliAsk.prompt([{
      name: 'version',
      type: 'string',
      message: 'Enter a custom version',
    }])

    if (semver.valid(customVersion.version)) {
      nextVersion = customVersion
    } else {
      cli.error("Invalid version.")
    }
  }

  pkg.src.json.version = nextVersion.version
  pkg.dist.json.version = nextVersion.version
}

async function apply({ modifiedPackages }) {
  await Promise.all(modifiedPackages.map(async (pkg) => {
    if(pkg.src.json.version !== 'Do not release') {
      await fileUtils.saveJson(path.resolve(pkg.src.path, 'package.json'), pkg.src.json)
      await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.dist.json)
    }
  }))
}


async function revert({ modifiedPackages }) {
  await Promise.all(modifiedPackages.map(async (pkg) => {
    await fileUtils.saveJson(path.resolve(pkg.src.path, 'package.json'), pkg.oldSrcJson)
    await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.oldDistJson)
  }))
}

async function revertResolve({ modifiedPackages }) {
  await Promise.all(modifiedPackages.map(async (pkg) => {
    await fileUtils.saveJson(path.resolve(pkg.src.path, 'package.json'), pkg.src.oldJson)
    await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.dist.oldJson)
  }))
}

async function fullResolve({ path }) : Promise<string[]> {
  return new Promise((resolve) => {
    const options = {
      ignoreBinPackage: false, // ignore the packages with bin entry
      skipMissing: false, // skip calculation of missing dependencies
    }

    depcheck(path, options, (deps) => {
      resolve(Object.keys(deps.using))
    })
  })
}

async function cheapResolve({ json }) {
  return Object.keys({
    ...(json.peerDependencies || {}),
    ...(json.dependencies || {}),
  })
}

async function injectDependencies({ root, allPackages, packages, global, kind }) {
  const rootJson = await fileUtils.getJson(path.resolve(root, 'package.json'))
  const rootDependencies = {
    ...(rootJson.peerDependencies || {}),
    ...(rootJson.dependencies || {}),
  }

  await Promise.all(packages.map(async (pkg) => {
    const resolve = pkg.options.resolve || global.resolve
    const peerDependencies = pkg[kind].json.peerDependencies || {}
    const dependencies = pkg[kind].json.dependencies || {}

    const resolved = []
    if(resolve === 'full') {
      resolved.push(...(await fullResolve({ path: pkg[kind].path })))
    }

    resolved.push(...(await cheapResolve({ json: pkg[kind].json })))

    const next = {
      ...pkg[kind].json,
      dependencies: {},
      peerDependencies: {},
    }

    resolved.sort().forEach((dep) => {
      const pkg = packages.find(p => p.dist.json.name === dep)
      const allPkg = allPackages.find(p => p.dist.json.name === dep) || { dist: { json: { version: null } } }
      const pkgVersion = (pkg ? pkg.dist.json.version : allPkg.dist.json.version)
      const detectedVersion = (pkgVersion) ? '^' + pkgVersion : pkgVersion
      const version = (detectedVersion || peerDependencies[dep] || dependencies[dep] || rootDependencies[dep])

      if(version) {
        if (peerDependencies[dep]) {
          next.peerDependencies[dep] = version
        } else {
          next.dependencies[dep] = version
        }
      } else {
        if(kind === 'dist') {
          cli.error('Missing dependency: ' + dep)
        }
      }
    })

    pkg[kind].oldJson = pkg[kind].json
    pkg[kind].json = next
  }))
}

async function check({ modifiedPackages, interrupted }) {
  if(interrupted) {
    cli.info('Process was interrupted, restoring packages to old values')
    await revert({ modifiedPackages })
    process.exit(0)
  }
}

/** Command function **/
export async function command({
  root, allPackages, packages, all,
  build, tag, git,
  quiet, global,
}) {
  let interrupted = false

  const repo = gitUtils.repository(root)

  const isRepo = await repo.checkIsRepo()

  if(isRepo) {
    const branch = await repo.branch(['--no-color'])

    if(branch.current !== git.branch) {
      cli.fatal(`Cannot publish from branch "${branch.current}", please checkout "${git.branch}" before publishing`)
    }
  }

  // Get a list of modified packages
  const modifiedPackages = await getStatus({
    root, packages, all,
  })

  if(!modifiedPackages.length) {
    cli.info('All packages are up to date!')
    return
  }

  // Bump versions
  const bumpTriggers = modifiedPackages.map(pkg => async () => {
    pkg.oldSrcJson = JSON.parse(JSON.stringify(pkg.src.json))
    pkg.oldDistJson = JSON.parse(JSON.stringify(pkg.dist.json))

    await bump({ pkg })
  })

  await processUtils.chainedPromises(bumpTriggers)

  await apply({ modifiedPackages })

  const toReleasePackages = modifiedPackages.filter(pkg => pkg.src.json.version !== 'Do not release')

  if(!toReleasePackages.length) {
    await revert({ modifiedPackages })
    cli.info('No package to release')
    return
  }

  process.on('SIGINT', async () => {
    interrupted = true
  })

  // If needed, build all packages
  if(build) {
    cli.info('Building packages before release')

    try {
      await buildCommand({
        packages: toReleasePackages,
        global,
        quiet,
      })
    } catch(err) {
      if(!interrupted) {
        cli.error('An error occurred during build, aborting release')
        await revert({modifiedPackages})
        return
      }
    }
  }

  await check({ modifiedPackages, interrupted })

  // Inject dependencies to packages dist
  cli.info('Resolving dependencies for packages')
  await injectDependencies({ root, allPackages, packages: toReleasePackages, global, kind: 'dist' })
  await injectDependencies({ root, allPackages, packages: toReleasePackages, global, kind: 'src' })

  await apply({ modifiedPackages: toReleasePackages })

  await check({ modifiedPackages, interrupted })

  cli.info('Executing release script')

  try {
    await releaseCommand({
      packages: toReleasePackages,
      global,
      quiet,
    })
  } catch(err) {
    if(!interrupted) {
      cli.error('An error occurred during release, reverting versions')
      await revert({modifiedPackages})
      return
    }
  }

  await check({ modifiedPackages, interrupted })

  // Commit to git
  if(isRepo) {
    await Promise.all(packages.map(async pkg => {
      await repo.add(pkg.src.path)
    }))
    await repo.commit("[Release] " + toReleasePackages.map(pkg => pkg.src.json.name + '-' + pkg.src.json.version).join(','))
  }

  if (isRepo && tag) {
    cli.info("Creating git tags...")
    for (const pkg of toReleasePackages) {
      try {
        await repo.addTag(`${git.tagPrefix}${git.tagPrefix !== '' ? '-' : ''}${pkg.src.json.name}@${pkg.src.json.version}`)
      } catch (err) {
        cli.error(`A tag with this version name already exists: ${pkg.src.json.name}@${pkg.src.json.version}. It has not been overwritten`)
      }
    }
  }

  if(isRepo) {
    cli.info("Pushing changes...")
    try {
      await repo.push()
      await repo.pushTags()
    } catch(err) {
      cli.error('An error occurred while pushing changes')
      cli.error(err)
    }
  }

  await check({ modifiedPackages, interrupted })

  // Revert all packages
  await revertResolve({ modifiedPackages: toReleasePackages })

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
      options.gitTagPrefix,
      options.gitBranch,
      options.quiet,
      options.resolve,
    ],
    command,
  })
}
