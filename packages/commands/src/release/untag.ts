import cli from 'cli'

import { processUtils } from '@mixt/utils'

import Command, { options } from 'command'

import { exec } from 'script/exec'

/** Command function **/
async function command({ packages, tag }) {
  await processUtils.chainedPromises(packages.map(p => async () => {
    const name = p.dist.json.name

    cli.info('Deleting tag ' + tag + ' on package ' + name)

    await processUtils.spawnCommand({
      cmd: 'npm dist-tag rm ' + name + ' ' + tag,
      silent: true,
      params: {},
    })
  }))
}

/** Command export */
export default function UntagComment(program) {
  Command(program, {
    name: 'untag <tag> [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
