import Command, { options } from 'command'

import { exec } from 'script/exec'

/** Command function **/
async function command({ packages, quiet }) {
  await exec({ packages, command: 'npm i', quiet })
}

/** Command export */
export default function InstallCommand(program) {
  Command(program, {
    name: 'i [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
  Command(program, {
    name: 'install [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
