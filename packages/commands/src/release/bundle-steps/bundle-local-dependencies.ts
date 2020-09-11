import cli from 'cli'
import path from 'path'

import { fileUtils, processUtils } from '@mixt/utils'

import { getCommonNestedDeps, getCommonAndLocalDeps } from 'release/bundle-steps/get-dependencies'

export async function bundleLocalDep({
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

  const nestedDependencies = (await getCommonNestedDeps({ packages: dependencies.common, packageLock }))
    .sort()
    .filter((e, i, a) => !checkedCommonDeps.includes(e) && a.indexOf(e) === i)

  cli.info('Found ' + nestedDependencies.length + ' nested dependencies, copying...')

  await processUtils.chainedPromises(nestedDependencies.map((dep) => async () => {
    if(!checkedCommonDeps.includes(dep)) {
      checkedCommonDeps.push(dep)

      if (!(await fileUtils.exists(path.resolve(rootNodeModules, dep)))) {
        cli.fatal('Dependency "' + dep + '" is missing, it is not possible to create a clean bundle')
      }

      if (!(await fileUtils.exists(path.resolve(bundleNodeModules, dep)))) {
        await fileUtils.mkdir(path.resolve(bundleNodeModules, dep))
        await fileUtils.cp(path.resolve(rootNodeModules, dep), path.resolve(bundleNodeModules, dep))
      }
    }
  }))

  dependencies.local.forEach((dep) => {
    if (!toBundleLocalDeps.includes(dep) && !checkedLocalDeps.includes(dep)) {
      toBundleLocalDeps.push(dep)
    }
  })
}

export async function bundleLocalDeps({
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
