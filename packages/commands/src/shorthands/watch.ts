import cli from 'cli'

import Command, { options } from 'command'

import { run } from 'script/run'

/** Command function **/
async function command({ packages, quiet, global }) {
  const pkgs = await run({ packages, scripts: ['watch', 'dev'], quiet, prefix: true, global, parallel: true })

  if(!pkgs.length) {
    cli.info(`No package implements script 'watch' or 'dev', nothing to run`)
  }
}

/** Command export */
export default function WatchCommand(program) {
  Command(program, {
    name: 'watch [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
