import cli from 'cli'

import Command, { options } from 'command'

import { exec } from 'script/exec'

/** Command function **/
async function command({ packages, quiet, global, allPackages, root }) {
  await exec({ packages, command: 'npm ci', quiet })
}

/** Command export */
export default function TestCommand(program) {
  Command(program, {
    name: 'ci [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
