import cli from 'cli'
import path from "path"
import {cp} from './utils/file'
import { pikaPackAvailable } from './utils/misc'
import * as process from './utils/process'
import * as file from './utils/file'

const spawnCommand = process.spawnCommand

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

async function copyCommand(cwd, pkg, packagesDir) {
  try {
    await cp(cwd, path.resolve(packagesDir, pkg.name))
    return true
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

export function loadBuilder(json, mixtBuilder) {
  if(mixtBuilder || (json.mixt && json.mixt.builder)) {
    const builderBase = mixtBuilder || json.mixt.builder.name || json.mixt.builder
    const builderName = builderBase.startsWith('mixt-builder') ? builderBase : `mixt-builder-${builderBase}`

    if(builderName !== "standard") {
      cli.info(`Loading builder "${builderName}"`)
      try {
        let builder = require(builderName)

        // Handle node-like export
        if(!builder.build && builder.default && builder.default.build) {
          builder = builder.default
        }

        return builder
      } catch(err) {
        cli.error(`"${builderName}" not found. Did you forget to install it?`)

        cli.fatal(err)
      }
    }

    return null
  }
}

export async function getBuilder(json) {
  const builder = loadBuilder(json)

  if(builder) {
    if(!builder.build) {
      cli.fatal(`"${builder.name}" does not expose a 'build' function. Please use a valid Mixt builder.`)
    }

    return (cwd, pkg, packagesDir, silent) => builder.build({ cwd, pkg, packagesDir, silent, utils: { process, file }, options: json.mixt.builder.options })
  }

  if(await detectPikaPack(json)) return pikaPackBuilder
  if(await detectMixt(json)) return mixtBuilder
  return copyBuilder
}

export async function getCommand(json) {
  const builder = loadBuilder(json)

  if(builder && builder.watch) {
      return (cwd, pkg, packagesDir, silent) => builder.watch({ cwd, pkg, packagesDir, silent, utils: { process, file }, options: json.mixt.builder.options })
  }

  if(await detectWatch(json)) return watchCommand
  if(await detectPikaPack(json)) return pikaPackCommand
  if(await detectMixt(json)) return mixtCommand
  return copyCommand
}
