import cli from 'cli'

import { processUtils } from '@mixt/utils'

import Command, { options } from 'command'

/** Command function **/
export async function exec({ packages, command, quiet }) {
  const pkg = packages[0]

  if(!pkg || packages.length > 1) {
    cli.fatal('mixt sh needs exactly one package')
  }

  cli.info(`Found package '${pkg.name}'`)

  // Get default os shell
  const hasSh = await processUtils.commandExists('sh')
  const hasBash = await processUtils.commandExists('bash')

  // Get user shell
  const userShell = process.env.SHELL

  const cmd = userShell || (hasBash ? 'bash' : hasSh ? 'sh' : null)


  if(!cmd) {
    cli.fatal('mixt sh needs sh or bash to be installed on your machine')
  }

  cli.info(`Starting interactive shell '${cmd}'`)

  console.log(process.getuid())

  // Launch the script
  await processUtils.spawnCommand({
    cmd: cmd + ' -i',
    silent: false,
    params: {
      cwd: pkg.src.path,
      env: {
        ...process.env,
        ZDOTDIR: process.env.HOME,
      },
      uid: process.getuid(),
    }
  })
}

/** Command export */
export default function ShCommand(program) {
  Command(program, {
    name: 'sh [package]',
    command: exec,
  })
}
