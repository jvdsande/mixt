import cli from 'cli'

import { processUtils } from '@mixt/utils'

import Command, { options } from 'command'

import { exec } from 'script/exec'

/** Command function **/
async function command({ packages, quiet, tag }) {
  await processUtils.chainedPromises(packages.map(p => async () => {
    const version = p.dist.json.version
    const name = p.dist.json.name

    cli.info('Tagging package ' + name + '@' + version + ' as ' + tag)

    await processUtils.spawnCommand({
      cmd: 'npm dist-tag add ' + (name + '@' + version) + ' ' + tag,
      silent: true,
      params: {},
    })
  }))
}

/** Command export */
export default function TagCommand(program) {
  Command(program, {
    name: 'tag <tag> [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
