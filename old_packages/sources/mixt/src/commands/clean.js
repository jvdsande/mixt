import cli from 'cli'

import rmrf from 'rmrf'

import Command from '../command'
import {mkdir} from '../utils/file'

/** Private functions **/

/** Command function **/
export async function command({
  packagesDir,
}) {
  cli.info("Cleaning " + JSON.stringify(packagesDir) + "...")

  await rmrf(packagesDir)
  await mkdir(packagesDir, {})
}

/** Command export */
export default function CleanCommand(program) {
  Command(program, {
    name: 'clean',
    command,
  })
}
