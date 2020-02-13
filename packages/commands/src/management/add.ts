import path from 'path'
import fs from 'fs'

import cli from 'cli'

import { fileUtils, processUtils } from '@mixt/utils'

import Command, {options} from 'command'

import { hoist } from './hoist'

/** Command function **/
async function command({ source, package: pkg, allPackages, root, resolve, prefix, dist }) {
  const pkgPath = path.resolve(root, source, pkg)

  // Create the package
  cli.info(`Creating new package at '${source}/${pkg}'`)
  await fileUtils.mkdir(pkgPath)
  await processUtils.spawnCommand({
    cmd: 'npm init',
    params: {
      cwd: pkgPath,
    }
  })

  if(!fs.existsSync(path.resolve(pkgPath, 'package.json'))) {
    cli.info('Package was not created, exiting')
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
    name: 'add <source> <package>',
    options: [
      options.resolve,
      options.prefix,
      options.dist,
    ],
    command,
  })
}
