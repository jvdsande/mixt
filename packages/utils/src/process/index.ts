import cli from 'cli'
import { spawn, SpawnOptions } from 'child_process'

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
    const [cmdRoot, ...cmdArgs] = cmd.split(' ')

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
      if(code) {
        reject(code)
      }
      resolve(!code);
    });
  });
}


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
