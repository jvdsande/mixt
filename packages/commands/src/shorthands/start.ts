import cli from 'cli'

import Command, { options } from 'command'

import { run } from 'script/run'

/** Command function **/
async function command({ packages, quiet, global, allPackages, root }) {
  const pkgs = await run({ packages, scripts: ['start'], quiet, prefix: true, global, allPackages, root })

  if(!pkgs.length) {
    cli.info(`No package implements script 'start', nothing to run`)
  }
}

/** Command export */
export default function StartCommand(program) {
  Command(program, {
    name: 'start [packages...]',
    options: [
      options.quiet,
      options.options,
    ],
    command,
  })
}
