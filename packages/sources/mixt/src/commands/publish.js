import cli from 'cli'
import cliAsk from 'inquirer'
import path from 'path'
import semver from 'semver'

import Command, { options } from '../command'

import { saveJson } from '../utils/file'
import { Git } from '../utils/git'
import { getGlobalPackages, getLocalPackages, getPackageJson } from '../utils/package'
import { spawnCommand} from '../utils/process'

import { buildPackage } from './build'
import { resolvePackage } from './resolve'
import { getStatus } from './status'

/** Private functions **/
async function prepublishPackage({ pkg }) {
  const { json } = pkg

  const version = json.version || '0.0.0'

  const nextMajor = semver.inc(version, 'major')
  const nextMinor = semver.inc(version, 'minor')
  const nextPatch = semver.inc(version, 'patch')
  const betaMajor = semver.inc(version, 'premajor', 'alpha')
  const betaMinor = semver.inc(version, 'preminor', 'alpha')
  const betaPatch = semver.inc(version, 'prepatch', 'alpha')

  let nextVersion = await cliAsk.prompt([{
    name: 'version',
    type: 'list',
    message: `Select the new version for "${json.name}" (current version: ${json.version})`,
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

    if(semver.valid(customVersion.version)) {
      nextVersion = customVersion
    } else {
      cli.error("Invalid version.")
    }
  }

  return nextVersion.version
}

async function setPackageVersion({ json, packagesDir, version, cwd }) {
  // Update the package.json
  json.version = version
  await saveJson(path.resolve(cwd, 'package.json'), json)

  // Update the built package.json
  try {
    const builtJson = await getPackageJson(packagesDir, json.name)
    builtJson.version = version
    await saveJson(path.resolve(packagesDir, json.name, 'package.json'), builtJson)
  } catch(err) {

  }
}

async function publishPackage({
  pkg, packagesDir,
}) {
  const { json, version, cwd } = pkg

  // Update the version
  await setPackageVersion({ json, packagesDir, version, cwd })

  // Check for private
  if(pkg.json.private) {
    cli.info(`Package "${pkg.json.name}" is private. Skipping publish step.`)
    return true
  }

  try {
    // Publish
    cli.info(`Publishing package "${pkg.json.name}" version ${pkg.version}...`)

    await spawnCommand('npm', ['publish'], {cwd: path.resolve(packagesDir, pkg.json.name)})

    cli.info(`"${pkg.json.name}" published!`)

    return true
  } catch(err) {
    cli.error(`Error while publishing package "${pkg.json.name}": `, err)

    return false
  }
}


/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages,
  quietBuild, build, tag, resolve,
  git: gitConfig, cheap, force,
}) {
  const localPackages = await getLocalPackages(packagesDir)
  const globalPackages = await getGlobalPackages(rootDir)

  let modifiedPackages = await getStatus({
    rootDir, packagesDir, sourcesDir, packages, force,
  })

  const git = new Git(rootDir)
  const isRepo = await git.checkIsRepo()

  if(isRepo) {
    const branch = await git.branch(['--no-color'])

    if(branch.current !== gitConfig.branch) {
      cli.fatal(`Cannot publish from branch "${branch.current}", please checkout "${gitConfig.branch}" before publishing`)
    }
  }

  // Find new version
  for (const pkg of modifiedPackages) {
    pkg.oldVersion = pkg.json.version
    pkg.version = await prepublishPackage({ pkg })
  }

  modifiedPackages = modifiedPackages.filter(pkg => pkg.version !== 'Do not release')

  if(!modifiedPackages.length) {
    cli.info("No packages to publish, exiting...")
    return
  }

  async function revert() {
    for(const pkg of modifiedPackages) {
      await setPackageVersion({
        json: pkg.json,
        cwd: pkg.cwd,
        packagesDir,
        version: pkg.oldVersion,
      })
    }
  }

  let success = true

  // Build packages (if not --noBuild)
  if(build) {
    for (const pkg of modifiedPackages) {
      success = success && await buildPackage({ source: pkg.source, pkg, packagesDir, quietBuild })

      if(!success) {
        cli.error("An error occurred while building. Aborting publish...")
        return revert()
      }
    }
  }

  // Resolve packages (if not --noResolve)
  if(resolve) {
    for(const pkg of modifiedPackages) {
      success = success && await resolvePackage({
        cheap,
        pkg: pkg.json.name, packagesDir,
        localPackages,
        globalPackages,
      })

      if(!success) {
        cli.fatal("An error occurred while resolving. Aborting publish...")
        return revert()
      }
    }
  }

  // Publish packages
  for (const pkg of modifiedPackages) {
    success = success && await publishPackage({
      pkg,
      packagesDir,
    })

    if(!success) {
      cli.fatal("An error occurred while publishing. Aborting publish...")
      return revert()
    }
  }

  // Commit to git
  if(isRepo) {
    await Promise.all(sourcesDir.map(async source => {
      await git.add(source)
    }))
    await git.commit("[Release] " + modifiedPackages.map(pkg => pkg.json.name + '-' + pkg.version).join(','))
  }

  if (isRepo && tag) {
    cli.info("Creating git tags...")
    for (const pkg of modifiedPackages) {
        try {
          await git.addTag(`${gitConfig.tagPrefix}${gitConfig.tagPrefix !== '' ? '-' : ''}${pkg.json.name}@${pkg.version}`)
        } catch (err) {
          cli.error(`A tag with this version name already exists: ${pkg.json.name}@${pkg.version}. It has not been overwritten`)
        }
    }
  }

  cli.info("Pushing changes...")
  if(isRepo) {
    try {
      await git.push()
      await git.pushTags()
    } catch(err) {
      cli.error('An error occured while pushing changes')
      cli.error(err)
    }
  }
  cli.info("Done!")
}

/** Command export */
export default function PublishCommand(program) {
  Command(program, {
    name: 'publish [packages...]',
    options: [
      options.quietBuild,
      options.noBuild,
      options.noResolve,
      options.noTag,
      options.branch,
      options.prefix,
      options.cheap,
      options.force,
    ],
    command,
  })
}
