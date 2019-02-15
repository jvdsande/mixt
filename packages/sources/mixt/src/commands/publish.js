import cli from 'cli'
import cliAsk from 'inquirer'
import path from 'path'
import semver from 'semver'

import Command from '../command'

import { writeFile } from '../utils/file'
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
    choices: [nextPatch, nextMinor, nextMajor, 'custom', betaPatch, betaMinor, betaMajor, 'Do not release'],
    pageSize: 10,
  }])

  while(nextVersion.version === 'custom') {
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

async function publishPackage({
  pkg, packagesDir, rootDir, silentBuilds, res, build, tag,
  localPackages, globalPackages
}) {
  const { json, version, cwd } = pkg

  // Update the package.json
  json.version = version
  writeFile(path.resolve(cwd, 'package.json'), JSON.stringify(json, null, 2), 'utf-8')

  // If we don't build, manually update the built package.json
  if(!build) {
    const builtJson = await getPackageJson(packagesDir, name)
    builtJson.version = version
    writeFile(path.resolve(packagesDir, name, 'package.json'), JSON.stringify(builtJson, null, 2), 'utf-8')
  } else {
    await buildPackage({ source: pkg.source, pkg, packagesDir, silentBuilds })
  }

  if(res) {
    await resolvePackage({
      pkg, packagesDir,
      localPackages,
      globalPackages,
    })
  }

  cli.info(`Publishing package "${pkg.json.name}" version ${pkg.version}...`)

  await spawnCommand('npm', ['publish'], { cwd: path.resolve(packagesDir, pkg.json.name)})

  cli.info(`"${pkg.json.name}" published!`)
}


/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages,
  silentBuilds, build, tag, resolve,
  git: gitConfig,
}) {
  let modifiedPackages = await getStatus({
    rootDir, packagesDir, sourcesDir, packages,
  })

  const git = new Git(rootDir)
  const isRepo = await git.checkIsRepo()

  if(isRepo) {
    const branch = await git.branch(['--no-color'])

    if(branch.current !== gitConfig.branch) {
      cli.fatal(`Cannot publish from branch "${branch.current}", please checkout "${gitConfig.branch}" before publishing`)
    }
  }

  const localPackages = await getLocalPackages(packagesDir)
  const globalPackages = await getGlobalPackages(rootDir)

  for (const pkg of modifiedPackages) {
    pkg.version = await prepublishPackage({ pkg })
  }

  modifiedPackages = modifiedPackages.filter(pkg => pkg.version !== 'Do not release')


  // Commit to git
  if(isRepo) {
    await Promise.all(sourcesDir.map(async source => {
      await git.add(source)
    }))
    await git.commit("[Release] " + modifiedPackages.map(pkg => pkg.json.name + '@' + pkg.version).join(','))
  }

  for (const pkg of modifiedPackages) {
    await publishPackage({
      pkg,
      packagesDir,
      rootDir,
      silentBuilds,
      resolve,
      build,
      tag,
      localPackages,
      globalPackages
    })

    if(isRepo) {
      try {
        await git.addTag(`${gitConfig.tagPrefix}${gitConfig.tagPrefix !== '' ? '-' : ''}${pkg.json.name}@${pkg.version}`)
      } catch(err) {
        cli.error(`A tag with this version name already exists: ${pkg.json.name}@${pkg.version}. It has not been overwritten`)
      }
    }
  }

  if(isRepo) {
    try {
      await git.push()
      await git.pushTags()
    } catch(err) {
      cli.error('An error occured while pushing changes')
      cli.error(err)
    }
  }
}

/** Command export */
export default function PublishCommand(program) {
  Command(program, {
    name: 'publish [packages...]',
    options: [
      ['-S, --silent-builds', 'Turn off logging for build scripts'],
      ['-R, --no-resolve', 'Do not resolve packages before publishing (not recommended)'],
      ['-B, --no-build', 'Do not build packages before publishing (not recommended)'],
      ['-T, --no-tag', 'Do not add Git tag after publishing'],
    ],
    command,
  })
}
