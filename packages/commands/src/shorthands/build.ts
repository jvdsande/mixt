import cli from 'cli'

import Command, { options } from 'command'

import { run } from 'script/run'

/** Command function **/
export async function buildCommand({ packages, quiet, global }) {
  const pkgs = await run({ packages, scripts: ['build'], quiet, prefix: true, global })

  if(!pkgs.length) {
    cli.info(`No package implements script 'build', nothing to run`)
  }
}

/** Command export */
export default function BuildCommand(program) {
  Command(program, {
    name: 'build [packages...]',
    options: [
      options.quiet,
    ],
    command: buildCommand,
  })
}
