import Command from '../command'

import { spawnCommand } from '../utils/process'

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
}) {
  // Create the packages directory
  await spawnCommand('mkdir', ['-p', packagesDir], { cwd: rootDir }, true)

  // Create all the sources directories
  for(const source of sourcesDir) {
    await spawnCommand('mkdir', ['-p', source], { cwd: rootDir }, true)
  }

  // Initialize the NPM package
  await spawnCommand('npm', ['init'], {
    cwd: rootDir
  })
}

/** Command export */
export default function InitCommand(program) {
  Command(program, {
    name: 'init',
    command,
  })
}
