import cli from 'cli'

import { processUtils } from '@mixt/utils'

import Command, { options } from 'command'
import { hoist as hoistCommand } from 'management/hoist'

/** Helper functions **/
export async function detectScript({ pkg, scripts, prefix, global }) {
  // If a package has no script, ignore it
  if(!pkg.src.json.scripts) {
    return
  }

  // Get the package options
  const scriptPrefix = pkg.options.prefix || global.prefix

  if(prefix) {
    ([...scripts])
      .reverse()
      .forEach((script) => {
        scripts.unshift(scriptPrefix + script)
      })
  }

  // Get first implemented script, if any
  return scripts
    .filter(s => pkg.src.json.scripts[s])
    .shift()
}

export async function executeScript({ pkg, script, quiet }) {
  if(quiet) {
    cli.info(`Running '${'npm run ' + script}'`)
  }

  // Launch the script
  await processUtils.spawnCommand({
    cmd: 'npm run ' + script,
    silent: quiet,
    params: {
      cwd: pkg.src.path,
    }
  })

  if(quiet) {
    cli.info(`Done`)
  }
}

export async function run({ packages, allPackages, root, scripts, quiet, prefix, global, parallel = false, hoist = false }) {
  const pkgs = []

  const launchRuns = packages.map(pkg => async () => {
    // Detect the best matching script based on the provided options
    const script = await detectScript({ pkg, scripts, prefix, global })

    // If a package does not have our script, ignore it
    if(!script) {
      return
    }

    cli.info(`Found script '${script}' in '${pkg.name}'`)
    pkgs.push(pkg)

    // Execute the given script
    await executeScript({ pkg, script, quiet })

    if(hoist) {
      await pkg.reload()
      await hoistCommand({
        packages: [pkg],
        allPackages,
        add: true,
        root,
      })
    }
  })

  if(parallel) {
    await Promise.all(launchRuns.map(trigger => trigger()))
  } else {
    await processUtils.chainedPromises(launchRuns)
  }

  return pkgs
}

/** Command function **/
async function command({ packages, script, quiet, global, allPackages, root }) {
  const pkgs = await run({
    packages,
    allPackages,
    root,
    scripts: [script],
    quiet,
    prefix: false,
    global,
    hoist: false
  })

  if(!pkgs.length) {
    cli.info(`No package implements script '${script}', nothing to run`)
  }
}

/** Command export */
export default function RunCommand(program) {
  Command(program, {
    name: 'run <script> [packages...]',
    options: [
      options.quiet,
    ],
    command,
  })
}
