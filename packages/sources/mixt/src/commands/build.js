import cli from 'cli'
import path from "path"
import rmrf from 'rmrf'

import Command, { options } from '../command'
import { getBuilder } from '../builders'

import {
  cleanPackagesDirectory,
  getGlobalPackages,
  getLocalPackages,
  getPackagesBySource,
  installPackage,
} from '../utils/package'
import { createStub, spawnCommand } from '../utils/process'

import {resolvePackage} from './resolve'

/** Private functions **/
export async function buildPackage({ source, pkg, packagesDir, quietBuild }) {
  cli.info('Building ' + JSON.stringify(pkg.json.name))

  // Delete the build folder
  await rmrf(path.resolve(packagesDir, `./${pkg.json.name}`))

  // Check if a "build" script is present
  const buildScript = !!pkg.json.scripts && !!pkg.json.scripts.build

  if(buildScript) {
    cli.info('Build script found. Executing "npm run build"....')

    try {
      await spawnCommand('npm', ['run', 'build'], {cwd: pkg.cwd}, quietBuild)
      return true
    } catch(err) {
      cli.error(err)
      return false
    }
  } else {
    const builder = await getBuilder(pkg.json)

    return await builder(pkg.cwd, pkg.json, packagesDir, quietBuild)
  }
}

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir, allSourcesDir,
  quietBuild, resolve, packages,
  cheap,
}) {
  const start = new Date()

  await cleanPackagesDirectory(allSourcesDir, packagesDir)

  const packagesBySource = await getPackagesBySource(packages, sourcesDir)

  let nbPackages = 0
  let nbFailed = 0

  const successPackages = []

  // Make a stub for all local packages
  for(const source of packagesBySource) {
    for(const pkg of source.packages) {
      await createStub(packagesDir, pkg.json)
    }
  }

  for(const source of packagesBySource) {
    cli.info(`Found ${source.packages.length} package${source.packages.length > 1 ? 's' : ''} in ${source.source}`)

    for(const pkg of source.packages) {
      pkg.built = await buildPackage({ source, pkg, packagesDir, quietBuild })

      if(pkg.built) {
        nbPackages += 1
        successPackages.push(pkg)
      } else {
        nbFailed += 1
      }
    }
  }

  const end = new Date()
  const diff = (end.valueOf() - start.valueOf())
  const seconds = Math.floor((diff) / 1000)
  const cents = Math.round((diff - (seconds * 1000)) / 10)

  cli.info(`Built ${nbPackages} package${nbPackages > 1 ? 's' : ''} in ${seconds}.${cents}s`)

  if(nbFailed > 0) {
    cli.info(`Failed building ${nbFailed} package${nbFailed > 1 ? 's' : ''}`)
  }

  if(nbPackages < 1) {
    cli.fatal('No packages were successfully built, exiting')
  }

  cli.info("Installing dependencies")
  for(const pkg of successPackages) {
    await installPackage({
      pkg: pkg.json.name,
      packagesDir,
    })
  }
  cli.info(`Installed dependencies for ${successPackages.length} package${successPackages.length > 1 ? "s" : ""}`)

  if(resolve) {
    const globalPackages = await getGlobalPackages(rootDir)
    const localPackages = await getLocalPackages(packagesDir)

    for(const pkg of successPackages) {
      await resolvePackage({
        pkg: pkg.json.name,
        packagesDir,
        localPackages,
        globalPackages,
        cheap,
        resolver: pkg.json && pkg.json.mixt && pkg.json.mixt.resolver
      })
    }
  }
}

/** Command export */
export default function BuildCommand(program) {
  Command(program, {
    name: 'build [packages...]',
    options: [
      options.noResolve,
      options.quietBuild,
      options.cheap,
    ],
    command,
  })
}
