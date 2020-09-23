import cli from 'cli'
import { spawn, SpawnOptions, exec, ExecOptions } from 'child_process'

function getCmdArgs(parts : string[]) {
  let args = ['']
  let inDblQuote = false
  let inSingleQuote = false

  parts.forEach((c) => {
    if(c === '"' && !inSingleQuote) {
      inDblQuote = !inDblQuote
    }

    if(c === "'" && !inDblQuote) {
      inSingleQuote = !inSingleQuote
    }

    if(c === ' ' && !inSingleQuote && !inDblQuote) {
      args.unshift('')
    } else {
      args[0] += c
    }
  })

  return args.reverse()
}

/**
 * Spawn a command, optionally making it silent
 * @param {string} cmd - Command to run
 * @param {SpawnOptions} params - spawn parameters
 * @param {boolean} silent - whether to output logs
 */
export async function spawnCommand({
  cmd, params, silent = false
} : {
  cmd: string,
  params: SpawnOptions,
  silent?: boolean
}) {
  return new Promise(function (resolve, reject) {
    const cmdParts = cmd.split(' ')
    const cmdRoot = cmdParts.shift()
    const cmdArgs = getCmdArgs(cmdParts.join(' ').split(''))

    if(!silent) {
      cli.info(`Running '${cmd}'`)
    }

    const child = spawn(cmdRoot, cmdArgs, {
      stdio: silent ? 'ignore' : 'inherit',
      shell: process.platform === 'win32',
      ...params,
    });

    child.on('error', function (data) {
      cli.error('Error while running command: ' + data)
      reject(data);
    });

    child.on('exit', function (code) {
      if(code && code !== 130) {
        reject(code)
      }
      resolve(true);
    });
  });
}

/**
 * Exec a command, optionally making it silent
 * @param {string} cmd - Command to run
 * @param {SpawnOptions} params - spawn parameters
 * @param {boolean} silent - whether to output logs
 */
export async function execCommand({
 cmd, params, silent = false
} : {
  cmd: string,
  params: ExecOptions,
  silent?: boolean
}) {
  return new Promise(function (resolve, reject) {
    if(!silent) {
      cli.info(`Running '${cmd}'`)
    }

    const child = exec(cmd, {
      windowsHide: true,
      ...params,
    })

    if(!silent) {
      child.stdout.on('data', (data) => {
        console.log(data);
      })
    }

    child.on('error', function (data) {
      cli.error('Error while running command: ' + data)
      reject(data);
    })

    child.on('exit', function (code) {
      if(code) {
        reject(code)
      }
      resolve(!code);
    })
  })
}

export { default as commandExists } from 'command-exists'

export async function chainedPromises(promiseTriggers) {
  const launchNext = async () => {
    const trigger = promiseTriggers.shift()

    if(!trigger) {
      return
    }

    await trigger().then(launchNext)
  }

  await launchNext()
}
