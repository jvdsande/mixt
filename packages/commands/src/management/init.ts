import path from 'path'
import fs from 'fs'

import cli from 'cli'

import { fileUtils, processUtils } from '@mixt/utils'

import Command, {options} from 'command'

/** Command function **/
async function command({ sources, prefix, resolve, gitBranch, gitTagPrefix, root, config }) {
  // Initialize the package
  cli.info(`Creating new mixt monorepo`)
  const create = await processUtils.spawnCommand({
    cmd: 'npm init',
    params: {
      cwd: root,
    }
  })

  if(!fs.existsSync(path.resolve(root, 'package.json'))) {
    cli.info('Package was not created, exiting')
    return
  }

  cli.info('Package created successfully, saving config')

  // Prepare config
  const mixtConfig = {
    sources: sources || ['packages'],
    resolve,
    prefix,
    git: undefined,
  }

  if(gitBranch || gitTagPrefix) {
    mixtConfig.git = {
      branch: gitBranch,
      tagPrefix: gitTagPrefix,
    }
  }

  // Save config
  if(config === true) {
    await fileUtils.saveJson(path.resolve(root, 'mixt.json'), mixtConfig)
  }

  if(config === 'embed') {
    const json = await fileUtils.getJson(path.resolve(root, 'package.json'))
    json.mixt = mixtConfig
    await fileUtils.saveJson(path.resolve(root, 'package.json'), json)
  }

  // Create sources
  if(sources) {
    await Promise.all(sources.map(async source => {
      cli.info(`Adding source directory '${source}'`)
      await fileUtils.mkdir(path.resolve(root, source))
    }))
  } else {
    cli.info(`Adding source directory 'packages'`)
    await fileUtils.mkdir(path.resolve(root, 'packages'))
  }

  cli.ok('Done')
}

/** Command export */
export default function InitCommand(program) {
  Command(program, {
    init: true,
    name: 'init [sources...]',
    options: [
      options.config,
      options.resolve,
      options.prefix,
      options.gitBranch,
      options.gitTagPrefix,
    ],
    command,
  })
}
