import cli from 'cli'
import path from "path"
import { pikaPackAvailable } from './utils/misc'
import { spawnCommand } from './utils/process'

/* Builders */

async function copyBuilder(cwd, pkg, packagesDir, silent) {
  !silent && cli.info(`Copying "${pkg.name}" to ${packagesDir}...`)

  const done = await copyCommand(cwd, pkg, packagesDir, silent)

  done && !silent && cli.info('Done !')

  return done
}

async function mixtBuilder(cwd, pkg, packagesDir, silent) {
  !silent && cli.info('Found "mixt" script. Building...')

  const done = await mixtCommand(cwd, pkg, packagesDir, silent)

  done && !silent && cli.info('Done!')

  return done
}

async function pikaPackBuilder(cwd, pkg, packagesDir, silent) {
  !silent && cli.info('Found @pika/pack project. Building...')

  const done = await pikaPackCommand(cwd, pkg, packagesDir, silent)

  done && !silent && cli.info('Done!')

  return done
}


/* Commands */

async function copyCommand(cwd, pkg, packagesDir, silent) {
  try {
    return await spawnCommand(
      'cp',
      ['-rv', cwd, path.resolve(packagesDir, pkg.name)],
      {},
      silent,
    )
  } catch(err) {
    cli.error("An error occurred while building package " + JSON.stringify(pkg.name) + ": ", err)
    return false
  }
}

async function mixtCommand(cwd, pkg, packagesDir, silent) {
  try {
    return await spawnCommand(
      'npm',
      ['run', 'mixt'],
      {cwd},
      silent,
    )
  } catch(err) {
    cli.error("An error occurred while building package " + JSON.stringify(pkg.name) + ": ", err)
    return false
  }
}

async function pikaPackCommand(cwd, pkg, packagesDir, silent) {
  try {
    return await spawnCommand(
      'pack',
      [...`build --out=../../node_modules/${pkg.name}`.split(' ')],
      {cwd},
      silent,
    )
  } catch(err) {
    cli.error("An error occurred while building package " + JSON.stringify(pkg.name) + ": ", err)
    return false
  }
}

async function watchCommand(cwd, pkg, packagesDir, silent) {
  try {
    return await spawnCommand(
      'npm',
      [...`run watch`.split(' ')],
      {cwd},
      silent,
    )
  } catch(err) {
    cli.info("A problem occurred while watching package " + JSON.stringify(pkg.name))
    return false;
  }
}


/* Detectors */

async function detectWatch(json) {
  return json.scripts && json.scripts.watch
}

async function detectMixt(json) {
  return json.scripts && json.scripts.mixt;
}

async function detectPikaPack(json) {
  if(!json['@pika/pack']) {
    return false
  }

  return await pikaPackAvailable();
}


/* Exports */

export async function getBuilder(json) {
  if(await detectPikaPack(json)) return pikaPackBuilder
  if(await detectMixt(json)) return mixtBuilder
  return copyBuilder
}

export async function getCommand(json) {
  if(await detectWatch(json)) return watchCommand
  if(await detectPikaPack(json)) return pikaPackCommand
  if(await detectMixt(json)) return mixtCommand
  return copyCommand
}
