import { exec, spawn } from 'child_process'
import chokidar from 'chokidar'
import cli from 'cli'
import path from 'path'
import rmrf from 'rmrf'
import {resolvePackage} from '../commands/resolve'
import {mkdir, touch} from './file'
import {getGlobalPackages, getLocalPackages, installPackage} from './package'

export async function spawnProcess(cmd, silent) {
  return new Promise(function (resolve, reject) {
    const child = exec(cmd.trim());

    if(!silent) {
      child.stdout.on('data', function (data) {
        process.stdout.write(data);
      });
    }

    child.on('error', function (data) {
      cli.error('Error while running command: ' + data)
      reject(data);
    });

    child.on('exit', function () {
      resolve(true);
    });
  });
}

export async function spawnCommand(cmd, args, params, silent) {
  return new Promise(function (resolve, reject) {
    const child = spawn(cmd, args, {
      stdio: !silent ? 'inherit' : 'ignore',
      shell: process.platform == 'win32',
      ...params,
    });

    child.on('error', function (data) {
      cli.error('Error while running command: ' + data)
      reject(data);
    });

    child.on('exit', function (code) {
      if(code) {
        cli.error('Process exited with non-success exit code: ' + code)
        reject(code)
      }
      resolve(!code);
    });
  });
}

export async function spawnWatch(watcher, cwd, pkg, rootDir, packagesDir, silent, resolve, cheap) {
  let timeout = null
  let ranOnce = false
  let rerun = false
  let running = false

  const localPackages = await getLocalPackages(packagesDir)
  const globalPackages = await getGlobalPackages(rootDir)

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
      await rmrf(path.resolve(packagesDir, `./${pkg.name}`))

      // Build
      await watcher(cwd, pkg, packagesDir, silent)

      if(resolve) {
        // Resolve
        await resolvePackage({
          pkg: pkg.name,
          packagesDir,
          localPackages,
          globalPackages,
          cheap,
          resolver: pkg.mixt && pkg.mixt.resolver,
        })

        // Install
        await installPackage({pkg: pkg.name, packagesDir})

        cli.info("Dependencies up to date")
      }

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
  await rmrf(path.resolve(packagesDir, `./${pkg.name}`))

  // Build
  await watcher(cwd, pkg, packagesDir, silent)

  if(resolve) {
    // Resolve
    await resolvePackage({
      pkg: pkg.name,
      packagesDir,
      localPackages,
      globalPackages,
      cheap,
      resolver: pkg.mixt && pkg.mixt.resolver,
    })

    // Install
    await installPackage({pkg: pkg.name, packagesDir})

    cli.info("Dependencies up to date")
  }

  chokidar.watch(cwd, {ignored: /(^|[\/\\])\../, persistent: true}).on('all', build);
}

export async function createStub(packagesDir, pkg) {
  await rmrf(path.resolve(packagesDir, `./${pkg.name}`))

  await mkdir(path.resolve(packagesDir, `./${pkg.name}`), {})

  await touch(path.resolve(packagesDir, `./${pkg.name}`, './index.js'))
}
