import cli from 'cli'
import path from 'path'

import Command from '../command'

import { getPackageJson, getPackagesBySource } from '../utils/package'
import { spawnCommand } from '../utils/process'

/** Private functions **/
async function runScript({ source, pkg, script }) {
  if(pkg.json.scripts && pkg.json.scripts[script]) {
    cli.info('Running script ' + JSON.stringify(script) + ' in package ' + JSON.stringify(pkg.json.name) + '...')
    await spawnCommand('npm', ['run', script], { cwd: pkg.cwd })
  } else {
    cli.info('No ' + JSON.stringify(script) + ' script in package ' + JSON.stringify(pkg.json.name) + ', skipping.')
  }
}

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages, script,
}) {
  const packagesBySource = await getPackagesBySource(packages, sourcesDir)

  for(const source of packagesBySource) {
    for(const pkg of source.packages) {
      await runScript({ source, pkg, script })
    }
  }
}

/** Command export */
export default function RunCommand(program) {
  Command(program, {
    name: 'run <script> [packages...]',
    command,
  })
}
