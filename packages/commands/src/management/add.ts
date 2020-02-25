import path from 'path'
import fs from 'fs'

import cli from 'cli'

import { fileUtils, processUtils } from '@mixt/utils'

import Command, {options} from 'command'

import { hoist } from './hoist'

/** Command function **/
async function command({ source: argSrc, package: argPkg, allPackages, root, resolve, prefix, dist, defaultSource }) {
  if(!argPkg && !argSrc) {
    cli.fatal('You must provide a package name')
  }

  const pkg = argPkg || argSrc
  const source = argPkg ? argSrc : defaultSource

  const pkgPath = path.resolve(root, source || defaultSource, pkg)

  // Create the package
  cli.info(`Creating new package at '${source || defaultSource}/${pkg}'`)
  await fileUtils.mkdir(pkgPath)
  await processUtils.spawnCommand({
    cmd: 'npm init',
    params: {
      cwd: pkgPath,
    }
  })

  if(!fs.existsSync(path.resolve(pkgPath, 'package.json'))) {
    cli.info('Package was not created, exiting')
    const files = await fileUtils.readDir(pkgPath)
    if(files.length < 1) {
      await fileUtils.rm(pkgPath)
    }
    return
  }

  // Get the generated package.json
  const json = await fileUtils.getJson(path.resolve(pkgPath, 'package.json'))

  if(resolve || prefix || dist) {
    json.mixt = {
      resolve,
      prefix,
      dist,
    }

    await fileUtils.saveJson(path.resolve(pkgPath, 'package.json'), json)
  }

  cli.info(`Hoisting newly created package`)

  const packages = [
    {
      name: pkg,
      src: {
        exists: true,
        json,
      },
      dist: {
        exists: true,
        json,
        relativePath: path.relative(root, path.resolve(pkgPath, dist || '')),
      }
    }
  ]

  await hoist({
    add: true,
    root,
    allPackages: [...allPackages, ...packages],
    packages,
  })
}

/** Command export */
export default function AddCommand(program) {
  Command(program, {
    init: true,
    name: 'add [source] [package]',
    options: [
      options.resolve,
      options.prefix,
      options.dist,
    ],
    command,
  })
}
