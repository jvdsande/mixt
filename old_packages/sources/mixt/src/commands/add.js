import path from 'path'

import cli from 'cli'

import {loadBuilder} from '../builders'

import Command, {options} from '../command'
import {mkdir, saveJson} from '../utils/file'
import {getPackageJson} from '../utils/package'

import {spawnCommand} from '../utils/process'

/** Command function **/
export async function command({
                                pkg, rootDir, packagesDir, source, sourcesDir, builder,
                              }) {
  const pkgParts = pkg.split('/')

  // Resolve the source directory
  let sourceDir = source ? path.resolve(packagesDir, '../', source) : sourcesDir[0]

  if (pkgParts.length > 1) {
    if (source) {
      sourceDir = path.resolve(packagesDir, '../', source, `./${pkgParts.shift()}`)
    } else {
      sourceDir = path.resolve(packagesDir, '../', `./${pkgParts.shift()}`)
    }
  }

  sourceDir = path.resolve(sourceDir, pkgParts.join('/'))

  // Create the new package folder
  await mkdir(path.resolve(rootDir, sourceDir), {})

  // Initialize the NPM package
  await spawnCommand('npm', ['init'], {cwd: sourceDir})

  // Check for builder
  if (builder) {
    const mixtBuilder = loadBuilder(null, builder)

    if (mixtBuilder && mixtBuilder.configure) {
      cli.info("Configuring Mixt builder...")

      const json = await getPackageJson(sourceDir)

      json.mixt = mixtBuilder.configure()

      await saveJson(path.resolve(sourceDir, 'package.json'), json)

      cli.info("Mixt builder configured")
    }
  }
}

/** Command export */
export default function AddCommand(program) {
  Command(program, {
    name: 'add <pkg>',
    command,
    options: [
      options.source,
      options.builder,
    ]
  })
}
