import cli from 'cli'
import {getCommand} from '../builders'
import Command, {options} from '../command'

import {getPackagesBySource} from '../utils/package'
import {createStub, spawnWatch} from '../utils/process'

/** Private functions **/
async function watchPackage({ pkg, packagesDir, quietBuild }) {
  cli.info('Watching ' + JSON.stringify(pkg.json.name) + '...')

  // Check if a "watch" script is present
  const watchScript = pkg.json.scripts && pkg.json.scripts.watch

  const watcher = await getCommand(pkg.json)

  if (watchScript) {
    // Proceed without waiting, as this command should not quit
    watcher(pkg.cwd, pkg.json, packagesDir, quietBuild)
  } else {
    await spawnWatch({
      watcher,
      cwd: pkg.cwd, pkg: pkg.json,
      packagesDir, silent: quietBuild,
    })
  }
}

/** Command function **/
export async function command({
  packagesDir, sourcesDir,
  packages, quietBuild,
}) {
  const packagesBySource = await getPackagesBySource(packages, sourcesDir)

  // Make a stub for all local packages
  for (const source of packagesBySource) {
    for (const pkg of source.packages) {
      await createStub(packagesDir, pkg.json)
    }
  }

  for (const source of packagesBySource) {
    for (const pkg of source.packages) {
      await watchPackage({ pkg, packagesDir, quietBuild })
    }
  }
}

/** Command export */
export default function WatchCommand(program) {
  Command(program, {
    name: 'watch [packages...]',
    options: [
      options.quietBuild,
    ],
    command,
  })
}
