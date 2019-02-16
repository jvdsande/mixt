import path from 'path'

import Command, { options } from '../command'

import { spawnCommand } from '../utils/process'

/** Command function **/
export async function command({
  pkg, rootDir, packagesDir, source, sourcesDir,
}) {
  const pkgParts = pkg.split('/')

  // Resolve the source directory
  let sourceDir = source ? path.resolve(packagesDir, '../', source) : sourcesDir[0]

  if(pkgParts.length > 1) {
    if(source) {
      sourceDir = path.resolve(packagesDir, '../', source, `./${pkgParts.shift()}`)
    } else {
      sourceDir = path.resolve(packagesDir, '../', `./${pkgParts.shift()}`)
    }
  }

  sourceDir = path.resolve(sourceDir, pkgParts.join('/'))

  // Create the new package folder
  await spawnCommand('mkdir', ['-p', sourceDir], { cwd: rootDir }, true)

  // Initialize the NPM package
  await spawnCommand('npm', ['init'], { cwd: sourceDir })
}

/** Command export */
export default function AddCommand(program) {
  Command(program, {
    name: 'add <pkg>',
    command,
    options: [
      options.source,
    ]
  })
}
