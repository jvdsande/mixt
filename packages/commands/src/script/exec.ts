import cli from 'cli'

import { processUtils } from '@mixt/utils'

import Command, { options } from 'command'

/** Command function **/
async function command({ packages, command, quiet }) {
  const launchExecs = packages.map(pkg => async () => {
    cli.info(`Found package '${pkg.name}'`)

    if(quiet) {
      cli.info(`Running '${command}'`)
    }

    // Launch the script
    await processUtils.spawnCommand({
      cmd: command,
      silent: quiet,
      params: {
        cwd: pkg.src.path,
      }
    })

    if(quiet) {
      cli.info(`Done`)
    }
  })

  await processUtils.chainedPromises(launchExecs)
}

/** Command export */
export default function ExecCommand(program) {
  Command(program, {
    name: 'exec <command> [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
