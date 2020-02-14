import cli from 'cli'
import path from 'path'

import { fileUtils, processUtils } from '@mixt/utils'

import Command from 'command'

/** Command function **/
export async function hoist({
  packages, allPackages, root, add,
}) {
  const rootJson : {
    dependencies?: {[key: string]: string}
  } = await fileUtils.getJson(path.resolve(root, 'package.json'))

  packages.forEach(pkg => {
    if(!add) {
      cli.info(`Found package '${pkg.name}', adding to dependencies`)
    }

    if(!pkg.dist.exists) {
      cli.info('The package does not seem to be built yet. Don\'t forget to build it!')
    }

    rootJson.dependencies = rootJson.dependencies || {}
    rootJson.dependencies[pkg.dist.json.name || pkg.src.json.name] = `file:${pkg.dist.relativePath}`
  })

  cli.info('Linking dependencies...')
  await fileUtils.saveJson(path.resolve(root, 'package.json'), rootJson)

  try {
    await Promise.all(packages.map(async (pkg) => {
      const name = pkg.dist.json.name || pkg.src.json.name
      await fileUtils.rm(path.resolve(root, 'node_modules', name))
    }))

    await processUtils.spawnCommand({
      cmd: 'npm i ' + packages.map(pkg => pkg.dist.json.name || pkg.src.json.name).join(' '),
      silent: true,
      params: {
        cwd: root,
      }
    })
  } catch(err) {
    cli.info("At least one package was not successfully linked. Maybe it wasn't built yet?")
  }


  // Get all mixt-handled packages to the top
  const orderedDependencies = {}
  const alphabeticallyOrderedDependencies = Object.keys(rootJson.dependencies).sort()
  alphabeticallyOrderedDependencies.forEach(dep => {
    if(rootJson.dependencies[dep].startsWith('file:')) {
      if(allPackages.find(p => p.src.json.name === dep || p.dist.json.name === dep)) {
        orderedDependencies[dep] = rootJson.dependencies[dep]
      } else {
        cli.info(`Local package ${dep} is not handled by mixt anymore, removing from dependencies`)
      }
    }
  })
  alphabeticallyOrderedDependencies.forEach(dep => {
    if(!rootJson.dependencies[dep].startsWith('file:')) {
      orderedDependencies[dep] = rootJson.dependencies[dep]
    }
  })
  rootJson.dependencies = orderedDependencies
  await fileUtils.saveJson(path.resolve(root, 'package.json'), rootJson)

  cli.ok('Done!')
}

/** Command export */
export default function HoistCommand(program) {
  Command(program, {
    name: 'hoist [packages...]',
    command: hoist,
  })
}
