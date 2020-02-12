import cli from 'cli'
import path from 'path'
import {cp} from './utils/file'
import * as process from './utils/process'
import * as file from './utils/file'

const spawnCommand = process.spawnCommand

/* Builders */
async function standardBuild(cwd, pkg, silent) {
  // Check if a "build" script is present
  const buildScript = !!pkg.scripts && !!pkg.scripts.build

  if(buildScript) {
    !silent && cli.info('Build script found. Executing "npm run build"....')

    try {
      await spawnCommand('npm', ['run', 'build'], {cwd}, silent)
    } catch(err) {
      cli.error(err)
      throw err
    }
  }
}

async function copyBuilder(cwd, pkg, packagesDir, silent) {
  try {
    await standardBuild(cwd, pkg, packagesDir, silent)
  } catch(err) {
    return false
  }

  !silent && cli.info(`Copying "${pkg.name}" to ${packagesDir}...`)

  const done = await copyCommand(cwd, pkg, packagesDir, silent)

  done && !silent && cli.info('Done !')

  return done
}

async function mixtBuilder(cwd, pkg, packagesDir, silent) {
  try {
    await standardBuild(cwd, pkg, packagesDir, silent)
  } catch(err) {
    return false
  }

  !silent && cli.info('Found "mixt" script. Building...')

  const done = await mixtCommand(cwd, pkg, packagesDir, silent)

  done && !silent && cli.info('Done!')

  return done
}

/* Commands */

async function copyCommand(cwd, pkg, packagesDir) {
  try {
    await cp(cwd, path.resolve(packagesDir, pkg.name))
    return true
  } catch (err) {
    cli.error('An error occurred while building package ' + JSON.stringify(pkg.name) + ': ', err)
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
  } catch (err) {
    cli.error('An error occurred while building package ' + JSON.stringify(pkg.name) + ': ', err)
    return false
  }
}

async function watchCommand(cwd, pkg, packagesDir, silent) {
  try {
    return await spawnCommand(
      'npm',
      `run watch`.split(' '),
      {cwd},
      silent,
    )
  } catch (err) {
    cli.info('A problem occurred while watching package ' + JSON.stringify(pkg.name))
    return false
  }
}


/* Detectors */

async function detectWatch(json) {
  return json.scripts && json.scripts.watch
}

async function detectMixt(json) {
  return json.scripts && json.scripts.mixt
}


/* Exports */

export function loadBuilder(json, mixtBuilder) {
  if (mixtBuilder || (json.mixt && json.mixt.builder)) {
    const builderBase = mixtBuilder || json.mixt.builder.name || json.mixt.builder
    const builderName = builderBase.startsWith('mixt-builder') ? builderBase : `mixt-builder-${builderBase}`

    if (builderName !== 'standard') {
      cli.info(`Loading builder "${builderName}"`)
      try {
        let builder = require(builderName)

        // Handle node-like export
        if (!builder.build && builder.default && builder.default.build) {
          builder = builder.default
        }

        return builder
      } catch (err) {
        cli.error(`"${builderName}" not found. Did you forget to install it?`)

        cli.fatal(err)
      }
    }

    return null
  }
}

export async function getBuilder(json) {
  const builder = loadBuilder(json)

  if (builder) {
    if (!builder.build) {
      cli.fatal(`"${builder.name}" does not expose a 'build' function. Please use a valid Mixt builder.`)
    }

    return (cwd, pkg, packagesDir, silent) => builder.build({
      cwd,
      pkg,
      packagesDir,
      silent,
      utils: {process, file},
      options: json.mixt.builder.options
    })
  }

  if (await detectMixt(json)) return mixtBuilder
  return copyBuilder
}

export async function getCommand(json) {
  const builder = loadBuilder(json)

  if (builder && builder.watch) {
    return (cwd, pkg, packagesDir, silent) => builder.watch({
      cwd,
      pkg,
      packagesDir,
      silent,
      utils: {process, file},
      options: json.mixt.builder.options
    })
  }

  if(builder && builder.build) {
    return (cwd, pkg, packagesDir, silent) => builder.build({
      cwd,
      pkg,
      packagesDir,
      silent,
      utils: {process, file},
      options: json.mixt.builder.options
    })
  }

  if (await detectWatch(json)) return watchCommand
  if (await detectMixt(json)) return mixtCommand
  return copyCommand
}
