import cli from 'cli'
import path from "path"

import Command from '../command'
import { getBuilder } from '../builders'

import {cleanPackagesDirectory, getPackageJson, getPackagesBySource} from '../utils/package'
import { createStub, spawnCommand } from '../utils/process'

import { command as Resolve } from './resolve'

/** Private functions **/
export async function buildPackage({ source, pkg, packagesDir, silentBuilds }) {
  cli.info('Building ' + JSON.stringify(pkg.json.name))

  // Delete the build folder
  await spawnCommand(
    'rm',
    ['-rf', path.resolve(packagesDir, `./${pkg.json.name}`)],
    {},
    silentBuilds
  )

  // Check if a "build" script is present
  const buildScript = !!pkg.json.scripts && !!pkg.json.scripts.build

  if(buildScript) {
    cli.info('Build script found. Executing "npm run build"....')

    await spawnCommand('npm', ['run build'], { cwd: pkg.cwd }, silentBuilds)
  }

  const builder = await getBuilder(pkg.json)

  await builder(pkg.cwd, pkg.json, packagesDir, silentBuilds)
}

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  silentBuilds, resolve, packages
}) {
  const start = new Date()

  await cleanPackagesDirectory(sourcesDir, packagesDir)

  const packagesBySource = await getPackagesBySource(packages, sourcesDir)

  let nbPackages = 0

  // Make a stub for all local packages
  for(const source of packagesBySource) {
    for(const pkg of source.packages) {
      await createStub(packagesDir, pkg.json)
    }
  }

  for(const source of packagesBySource) {
    cli.info(`Found ${source.packages.length} package${source.packages.length > 1 ? 's' : ''} in ${source.source}`)

    for(const pkg of source.packages) {
      await buildPackage({ source, pkg, packagesDir, silentBuilds })
      nbPackages += 1
    }
  }

  const end = new Date()
  const diff = (end.valueOf() - start.valueOf())
  const seconds = Math.floor((diff) / 1000)
  const cents = Math.round((diff - (seconds * 1000)) / 10)

  cli.info(`Built ${nbPackages} package${nbPackages > 1 ? 's' : ''} in ${seconds}.${cents}s`)

  if(resolve) {
    await Resolve({
      packages, packagesDir, rootDir, sourcesDir,
    })
  }
}

/** Command export */
export default function BuildCommand(program) {
  Command(program, {
    name: 'build [packages...]',
    options: [
      ['-R, --no-resolve', 'Whether to run the resolve command after building'],
      ['-S, --silent-builds', 'Turn off logging for build scripts']
    ],
    command,
  })
}
