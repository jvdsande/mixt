import { exec, spawn } from 'child_process'
import chokidar from 'chokidar'
import cli from 'cli'
import path, {resolve} from 'path'

export async function spawnProcess(cmd, silent) {
  return new Promise(function (resolve) {
    const child = exec(cmd.trim());

    if(!silent) {
      child.stdout.on('data', function (data) {
        process.stdout.write(data);
      });
    }

    child.on('error', function (data) {
      cli.error('Error while running command: ' + data)
      resolve(false);
    });

    child.on('exit', function () {
      resolve(true);
    });
  });
}

export async function spawnCommand(cmd, args, params, silent) {
  return new Promise(function (resolve, reject) {
    const child = spawn(cmd, args, {
      stdio: !silent ? 'inherit' : undefined,
      ...params,
    });

    child.on('error', function (data) {
      cli.error('Error while running command: ' + data)
      resolve(false);
    });

    child.on('exit', function () {
      resolve(true);
    });
  });
}

export async function spawnWatch(watcher, cwd, pkg, packagesDir, silent) {
  let timeout = null
  let ranOnce = false
  let rerun = false
  let running = false


  const build = () => {
    clearTimeout(timeout)
    timeout = setTimeout(async () => {
      if(running) {
        rerun = true
        return
      }

      if(!ranOnce) {
        ranOnce = true
        return
      }
      running = true

      cli.info('Package ' + JSON.stringify(pkg.name) + ' has changed. Rebuilding...')

      // Delete the build folder
      await spawnCommand(
        'rm',
        ['-rf', path.resolve(packagesDir, `./${pkg.name}`)],
        {},
        silent
      )
      // Build
      await watcher(cwd, pkg, packagesDir, silent)

      cli.info('Package ' + JSON.stringify(pkg.name) + ' built.')

      running = false

      if(rerun) {
        rerun = false
        build()
      }
    }, 300)
  }

  cli.info('Building package ' + JSON.stringify(pkg.name) + '...')

  // Delete the build folder
  await spawnCommand(
    'rm',
    ['-rf', path.resolve(packagesDir, `./${pkg.name}`)],
    {},
    silent
  )
  // Build
  await watcher(cwd, pkg, packagesDir, silent)
  cli.info('Done!')
  chokidar.watch(cwd, {ignored: /(^|[\/\\])\../, persistent: true}).on('all', build);
}

export async function createStub(packagesDir, pkg) {
  await spawnCommand(
    'rm',
    ['-rf', resolve(packagesDir, `./${pkg.name}`)]
  )
  await spawnCommand(
    'mkdir',
    ['-p', resolve(packagesDir, `./${pkg.name}`)]
  )
  await spawnCommand(
    'touch',
    [resolve(packagesDir, `./${pkg.name}`, './index.js')]
  )
}
