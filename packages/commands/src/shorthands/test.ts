import cli from 'cli'

import Command, { options } from 'command'

import { run } from 'script/run'

/** Command function **/
async function command({ packages, quiet, global, allPackages, root }) {
  const pkgs = await run({ packages, scripts: ['test'], quiet, prefix: true, global, allPackages, root })

  if(!pkgs.length) {
    cli.info(`No package implements script 'test', nothing to run`)
  }
}

/** Command export */
export default function TestCommand(program) {
  Command(program, {
    name: 'test [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
