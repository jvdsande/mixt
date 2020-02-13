import cli from 'cli'
import Command from '../command'

import { getPackagesBySource } from '../utils/package'
import { spawnProcess } from '../utils/process'

/** Private functions **/
async function runCommand({ source, pkg, cmd }) {
  cli.info('Running command ' + JSON.stringify(cmd) + ' in package ' + JSON.stringify(pkg.json.name) + '...')

  try {
    await spawnProcess(`cd "${pkg.cwd}" && ${cmd}`)
  } catch(err) {
    cli.fatal("An error occurred while running command " + JSON.stringify(cmd))
  }
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
