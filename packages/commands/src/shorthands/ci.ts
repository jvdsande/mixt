import Command, { options } from 'command'

import { exec } from 'script/exec'

/** Command function **/
async function command({ packages, quiet }) {
  await exec({ packages, command: 'npm ci', quiet })
}

/** Command export */
export default function CICommand(program) {
  Command(program, {
    name: 'ci [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
