import fs from 'fs'
import cli from 'cli'
import path from 'path'

import { fileUtils, processUtils } from '@mixt/utils'

import Command, {options} from 'command'

import { getCommonNestedDeps } from 'release/bundle-steps/get-dependencies'
import { bundleLocalDep, bundleLocalDeps } from 'release/bundle-steps/bundle-local-dependencies'
import { findAllPeerDependencies } from 'release/bundle-steps/find-peer-dependencies'

/** Command function **/
export async function command({
  root, allPackages, packages,
  global, bundle,
}) {
  cli.info('Bundling package ' + packages[0].dist.json.name)

  const bundlePath = path.resolve(packages[0].src.path, bundle || 'bundle')
  const bundleNodeModules = path.resolve(bundlePath, './node_modules')
  const rootNodeModules = path.resolve(root, './node_modules')
  const checkedCommonDeps = []
  const checkedLocalDeps = []

  cli.info('Bundling into ' + bundlePath)

  const exists = await fileUtils.exists(bundlePath)

  if(exists) {
    cli.fatal('Bundle folder already exists, stopping now')
  }

  const packageLock = await fileUtils.getJson(path.resolve(root, './package-lock.json'))

  if(!Object.keys(packageLock).length) {
    cli.fatal('package-lock.json was not found, bundle is not possible')
  }

  // Bundle main package
  const localDependencies = []
  const dependencies = await bundleLocalDep({
    dependency: packages[0],
    bundlePath,
    toBundleLocalDeps: localDependencies,
    checkedLocalDeps,
    checkedCommonDeps,
    rootNodeModules,
    bundleNodeModules,
    packageLock,
    global,
    allPackages,
  })

  cli.info('Bundling local dependencies')

  // Bundle all needed local packages
  await bundleLocalDeps({
    localDependencies,
    checkedLocalDeps,
    checkedCommonDeps,
    rootNodeModules,
    bundleNodeModules,
    packageLock,
    global,
    allPackages,
  })

  // Check for peerDependencies
  cli.info('Copying peer dependencies')
  const peerDependencies = await findAllPeerDependencies({ nodeModules: bundleNodeModules })

  cli.info('Copying ' + (peerDependencies.length) + ' common peer deps')

  const nestedDependencies = (await getCommonNestedDeps({ packages: peerDependencies, packageLock }))
    .sort()
    .filter((e, i, a) => !checkedCommonDeps.includes(e) && a.indexOf(e) === i)

  cli.info('Found ' + nestedDependencies.length + ' nested dependencies, copying...')

  await processUtils.chainedPromises(nestedDependencies.map((dep) => async () => {
    if(!checkedCommonDeps.includes(dep)) {
      checkedCommonDeps.push(dep)

      if (!(await fileUtils.exists(path.resolve(bundleNodeModules, dep)))) {
        // Peer deps can be either in root node_modules, or in one of the copied local packages node_modules
        const possiblePaths = [
          path.resolve(bundleNodeModules, dep),
          path.resolve(rootNodeModules, dep),
        ]

        checkedLocalDeps.forEach(d => {
          if(dep !== packages[0]) {
            possiblePaths.push(path.resolve(bundleNodeModules, d.dist.json.name, 'node_modules', dep))
          }
        })

        const depPath = possiblePaths.find(p => fs.existsSync(p))

        if(!depPath) {
          cli.fatal('Dependency "' + dep + '" is missing, it is not possible to create a clean bundle')
        }

        if (depPath !== path.resolve(bundleNodeModules, dep)) {
          await fileUtils.mkdir(path.resolve(bundleNodeModules, dep))
          await fileUtils.cp(depPath, path.resolve(bundleNodeModules, dep))
        }
      }
    }
  }))

  cli.ok("Done!")
}

/** Command export */
export default function BundleCommand(program) {
  Command(program, {
    name: 'bundle [package]',
    options: [
      options.quiet,
      options.resolve,
      options.bundle,
    ],
    command,
  })
}
