import cli from 'cli'
import {resolve} from "path"
import Command from '../command'

import { getPackagesBySource } from '../utils/package'
import { spawnProcess } from '../utils/process'

/** Private functions **/
async function runCommand({ source, pkg, cmd }) {
  cli.info('Running command ' + JSON.stringify(cmd) + ' in package ' + JSON.stringify(pkg.json.name) + '...')
  await spawnProcess(`cd "${pkg.cwd}" && ${cmd}`)
}

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages, cmd,
}) {
  const packagesBySource = await getPackagesBySource(packages, sourcesDir)

  for(const source of packagesBySource) {
    for(const pkg of source.packages) {
      await runCommand({ source, pkg, cmd })
    }
  }
}

/** Command export */
export default function ExecCommand(program) {
  Command(program, {
    name: 'exec <cmd> [packages...]',
    command,
  })
}
