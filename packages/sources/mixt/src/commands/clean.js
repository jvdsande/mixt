import cli from 'cli'

import Command from '../command'

import { spawnCommand } from '../utils/process'

/** Private functions **/

/** Command function **/
export async function command({
  packagesDir,
}) {
  cli.info("Cleaning " + JSON.stringify(packagesDir) + "...")

  await spawnCommand('rm', ['-rf', packagesDir], {}, true)
  await spawnCommand('mkdir', [packagesDir], {}, true)
}

/** Command export */
export default function CleanCommand(program) {
  Command(program, {
    name: 'clean',
    command,
  })
}
