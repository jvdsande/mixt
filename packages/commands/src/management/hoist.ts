import cli from 'cli'
import path from 'path'

import { fileUtils, processUtils } from '@mixt/utils'

import Command from 'command'

async function sortDependencies({ dependencies, allPackages, toRemoveDependencies, toInstallDependencies }) {
  const orderedDependencies = {}
  const alphabeticallyOrderedDependencies = Object.keys(dependencies).sort()
  await Promise.all(alphabeticallyOrderedDependencies.map(async dep => {
    if(dependencies[dep].startsWith('file:')) {
      const pkg = allPackages.find(p => (p.src.json.name === dep || p.dist.json.name === dep))
      if(pkg) {
        await pkg.reload()
      }

      if(pkg && pkg.dist.exists) {
        toInstallDependencies.push(dep)
        orderedDependencies[dep] = dependencies[dep]
      } else {
        toRemoveDependencies.push(dep)
        cli.info(`Local package ${dep} is not handled by mixt anymore, removing from dependencies`)
      }
    }
  }))
  alphabeticallyOrderedDependencies.forEach(dep => {
    if(!dependencies[dep].startsWith('file:')) {
      orderedDependencies[dep] = dependencies[dep]
    }
  })

  return orderedDependencies
}

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
      cli.info('The package does not seem to be built, it cannot be hoisted yet. Don\'t forget to build it!')
    } else {
      rootJson.dependencies = rootJson.dependencies || {}
      rootJson.dependencies[pkg.dist.json.name || pkg.src.json.name] = `file:${pkg.dist.relativePath}`
    }
  })


  // Get all mixt-handled packages to the top
  const toRemoveDependencies = []
  const toInstallDependencies = []
  rootJson.dependencies = await sortDependencies({ dependencies: rootJson.dependencies, allPackages, toRemoveDependencies, toInstallDependencies })

  cli.info('Linking dependencies...')
  await fileUtils.saveJson(path.resolve(root, 'package.json'), rootJson)

  try {
    await Promise.all(packages.map(async (pkg) => {
      const name = pkg.dist.json.name || pkg.src.json.name
      await fileUtils.rm(path.resolve(root, 'node_modules', name))
    }))
    await Promise.all(toRemoveDependencies.map(async (name) => {
      await fileUtils.rm(path.resolve(root, 'node_modules', name))
    }))

    await processUtils.spawnCommand({
      cmd: 'npm i ' + toInstallDependencies.join(' '),
      silent: true,
      params: {
        cwd: root,
      }
    })
  } catch(err) {
    cli.info("At least one package was not successfully linked. Maybe it wasn't built yet?")
  }

  // Save again to keep ordering
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
