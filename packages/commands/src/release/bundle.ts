import cli from 'cli'
import path from 'path'
import depcheck from 'depcheck'

import { fileUtils, processUtils } from '@mixt/utils'

import Command, {options} from 'command'

/** Helper functions **/
async function apply({ packages }) {
  await Promise.all(packages.map(async (pkg) => {
    if(pkg.src.json.version !== 'Do not release') {
      await fileUtils.saveJson(path.resolve(pkg.src.path, 'package.json'), pkg.src.json)
      await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.dist.json)
    }
  }))
}

async function reload({ packages }) {
  await Promise.all(packages.map(async (pkg) => {
    await pkg.reload()
  }))
}

async function revert({ packages }) {
  await Promise.all(packages.map(async (pkg) => {
    await fileUtils.saveJson(path.resolve(pkg.src.path, 'package.json'), pkg.oldSrcJson)
    await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.oldDistJson)
  }))
}

async function revertResolve({ packages }) {
  cli.info('Reverting version injection...')
  await Promise.all(packages.map(async (pkg) => {
    await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), pkg.dist.oldJson)
  }))
}

async function check({ packages, interrupted }) {
  if(interrupted) {
    cli.info('Process was interrupted, restoring packages to old values')
    await revert({ packages })
    process.exit(0)
  }
}

async function fullResolve({ path }) : Promise<string[]> {
  return new Promise((resolve) => {
    const options = {
      ignoreBinPackage: false, // ignore the packages with bin entry
      skipMissing: false, // skip calculation of missing dependencies
    }

    depcheck(path, options, (deps) => {
      resolve(Object.keys(deps.using))
    })
  })
}

async function cheapResolve({ json }) {
  return Object.keys({
    ...(json.peerDependencies || {}),
    ...(json.dependencies || {}),
  })
}

async function getCommonAndLocalDeps({ pkg, resolve, allPackages }) {
  const jsonPath = path.resolve(pkg, './package.json')
  const json = await fileUtils.getJson(jsonPath)

  const deps = {
    local: [],
    common: [],
  }

  if(resolve === 'none') {
    return deps
  }

  const resolved = []

  if(resolve === 'full') {
    resolved.push(...(await fullResolve({ path: pkg })))
  }

  resolved.push(...(await cheapResolve({ json })))

  resolved.forEach((dep) => {
    // Check if dep is local or common
    const localPackage = allPackages.find(p => p.dist.json.name === dep)
    if(localPackage) {
      deps.local.push(localPackage)
    } else {
      deps.common.push(dep)
    }
  })

  return deps
}

async function getCommonNestedDeps({ packages, packageLock }) {
  const dependencies = []

  while(packages.length) {
    const current = [...packages]
    packages.length = 0
    current.forEach(pkg => {
      // Add dependency
      dependencies.push(pkg)

      // Check pkg deps
      const info : any = Object.entries(packageLock.dependencies).find(([d]) => d === pkg)[1]

      const deps = Object.keys(info.requires || {})

      deps.forEach(dep => {
        if(!dependencies.includes(dep)) {
          packages.push(dep)
        }
      })
    })
  }

  return dependencies
}

async function bundleLocalDep({
  dependency,
  bundlePath,
  toBundleLocalDeps,
  checkedLocalDeps,
  checkedCommonDeps,
  rootNodeModules,
  bundleNodeModules,
  packageLock,
  global,
  allPackages,
}) {
  checkedLocalDeps.push(dependency)

  await fileUtils.mkdir(bundlePath)

  cli.info('Copying dist to bundle...')

  // Copy dist to bundle
  await fileUtils.cp(dependency.dist.path, bundlePath)
  // Copy source node_modules to bundle
  await fileUtils.cp(path.resolve(dependency.src.path, './node_modules'), path.resolve(bundlePath, './node_modules'))

  const dependencies = await getCommonAndLocalDeps({
    pkg: bundlePath,
    resolve: dependency.options.resolve || global.resolve,
    allPackages,
  })

  cli.info('Copying ' + (dependencies.common.length) + ' common deps')

  const nestedDependencies = await getCommonNestedDeps({ packages: dependencies.common, packageLock })

  cli.info('Found ' + nestedDependencies.length + ' nested dependencies, copying...')

  await Promise.all(nestedDependencies.map(async (dep) => {
    if(!checkedCommonDeps.includes(dep)) {
      checkedCommonDeps.push(dep)

      if (!(await fileUtils.exists(path.resolve(rootNodeModules, dep)))) {
        cli.fatal('Dependency "' + dep + '" is missing, it is not possible to create a clean bundle')
      }

      await fileUtils.mkdir(path.resolve(bundleNodeModules, dep))
      await fileUtils.cp(path.resolve(rootNodeModules, dep), path.resolve(bundleNodeModules, dep))
    }
  }))

  if(toBundleLocalDeps) {
    dependencies.local.forEach((dep) => {
      if (!toBundleLocalDeps.includes(dep) && !checkedLocalDeps.includes(dep)) {
        toBundleLocalDeps.push(dep)
      }
    })
  }

  return dependencies
}

async function bundleLocalDeps({
   localDependencies,
   checkedLocalDeps,
   checkedCommonDeps,
   rootNodeModules,
   bundleNodeModules,
   packageLock,
   global,
   allPackages,
}) {
  const toBundleLocalDeps = [...localDependencies]

  while(toBundleLocalDeps.length) {
    const current = [...toBundleLocalDeps]
    toBundleLocalDeps.length = 0

    await processUtils.chainedPromises(current.map((dep) => async () => {
      cli.info('Bundling local dep ' + dep.dist.json.name)
      await bundleLocalDep({
        dependency: dep,
        bundlePath: path.resolve(bundleNodeModules, dep.dist.json.name),
        toBundleLocalDeps,
        checkedLocalDeps,
        checkedCommonDeps,
        rootNodeModules,
        bundleNodeModules,
        packageLock,
        global,
        allPackages,
      })
    }))
  }
}

/** Command function **/
export async function command({
  root, allPackages, packages,
  build, quiet, global, bundle,
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

  const dependencies = await bundleLocalDep({
    dependency: packages[0],
    bundlePath,
    toBundleLocalDeps: undefined,
    checkedLocalDeps,
    checkedCommonDeps,
    rootNodeModules,
    bundleNodeModules,
    packageLock,
    global,
    allPackages,
  })

  cli.info('Bundling local dependencies')

  await bundleLocalDeps({
    localDependencies: dependencies.local,
    checkedLocalDeps,
    checkedCommonDeps,
    rootNodeModules,
    bundleNodeModules,
    packageLock,
    global,
    allPackages,
  })

  cli.ok("Done!")
}

/** Command export */
export default function BundleCommand(program) {
  Command(program, {
    name: 'bundle [package]',
    options: [
      options.noBuild,
      options.quiet,
      options.resolve,
      options.bundle,
    ],
    command,
  })
}
