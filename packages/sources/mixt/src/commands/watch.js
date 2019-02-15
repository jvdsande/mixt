import cli from 'cli'
import {resolve} from "path"
import {getCommand} from '../builders'
import Command from '../command'

import {getPackageJson, getPackagesBySource} from '../utils/package'
import {createStub, spawnWatch} from '../utils/process'

/** Private functions **/
async function watchPackage({ source, pkg, packagesDir, silentBuilds }) {
  cli.info('Watching ' + JSON.stringify(pkg.json.name) + '...')

  // Check if a "watch" script is present
  const watchScript = pkg.json.scripts && pkg.json.scripts.watch

  const watcher = await getCommand(pkg.json)

  if(watchScript) {
    await watcher(pkg.cwd, pkg.json, packagesDir, silentBuilds)
  } else {
    await spawnWatch(
      watcher,
      pkg.cwd, pkg.json, packagesDir, silentBuilds
    )
  }
}

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages, silentBuilds
}) {
  const packagesBySource = await getPackagesBySource(packages, sourcesDir)

  // Make a stub for all local packages
  for(const source of packagesBySource) {
    for(const pkg of source.packages) {
      await createStub(packagesDir, pkg.json)
    }
  }

  for(const source of packagesBySource) {
    for(const pkg of source.packages) {
      await watchPackage({ source, pkg, packagesDir, silentBuilds })
    }
  }
}

/** Command export */
export default function WatchCommand(program) {
  Command(program, {
    name: 'watch [packages]',
    options: [
      ['-S, --silent-builds', 'Turn off logging for build scripts']
    ],
    command,
  })
}
