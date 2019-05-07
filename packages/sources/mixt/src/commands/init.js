import path from 'path'

import Command, { options } from '../command'
import {getJson, mkdir, saveJson} from '../utils/file'

import { spawnCommand } from '../utils/process'

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir, config,
}) {
  // Create the packages directory
  await mkdir(packagesDir, {})

  // Create all the sources directories
  for(const source of sourcesDir) {
    await mkdir(path.resolve(rootDir, source), {})
  }

  // Initialize the NPM package
  await spawnCommand('npm', ['init'], {
    cwd: rootDir
  })


  // Write the config if needed
  if(config) {
    const pkgsDir = path.resolve(packagesDir, '../')

    const packages = pkgsDir.split(rootDir)[1].slice(1)
    const sources = sourcesDir.map(s => s.split(pkgsDir)[1].slice(1))

    let conf = {
      packages,
      sources
    }

    const confFile = config === 'embed' ? 'package.json' : 'mixt.json'

    if(config === 'embed') {
      const json = await getJson(path.resolve(rootDir, confFile))
      json.mixt = conf
      conf = json
    }

    await saveJson(path.resolve(rootDir, confFile), conf)
  }
}

/** Command export */
export default function InitCommand(program) {
  Command(program, {
    name: 'init',
    loadConfig: false,
    options: [
      options.config
    ],
    command,
  })
}
