import cli from 'cli'

import Command, { options } from 'command'

import { run } from 'script/run'

/** Command function **/
export async function buildCommand({ packages, quiet, global, allPackages, root, }) {
  const pkgs = await run({ packages, allPackages, root, scripts: ['build'], quiet, prefix: true, global, hoist: true })

  if(!pkgs.length) {
    cli.info(`No package implements script 'build', nothing to run`)
  }
}

/** Command export */
export default function BuildCommand(program) {
  Command(program, {
    name: 'build [packages...]',
    options: [
      options.hoist,
      options.quiet,
    ],
    command: buildCommand,
  })
}
