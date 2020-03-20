import cli from 'cli'
import path from 'path'
import depcheck from 'depcheck'

import { fileUtils } from '@mixt/utils'


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

async function injectDependencies({ root, allPackages, packages, global }) {
  const rootJson = await fileUtils.getJson(path.resolve(root, 'package.json'))
  const rootDependencies = {
    ...(rootJson.peerDependencies || {}),
    ...(rootJson.dependencies || {}),
  }

  await Promise.all(packages.map(async (pkg) => {
    const resolve = pkg.options.resolve || global.resolve

    if(resolve === 'none') {
      return
    }

    const peerDependencies = { ...(pkg.dist.json.peerDependencies || {}) }
    const dependencies = { ...(pkg.dist.json.dependencies || {}) }

    // Get rid of all '*' dependencies, only used for cheap-resolving to the root's dependencies
    Object.keys(peerDependencies).forEach(dep => {
      if(peerDependencies[dep] === '*') {
        peerDependencies[dep] = undefined
      }
    })
    Object.keys(dependencies).forEach(dep => {
      if(dependencies[dep] === '*') {
        dependencies[dep] = undefined
      }
    })

    const resolved = []
    if(resolve === 'full') {
      resolved.push(...(await fullResolve({ path: pkg.dist.path })))
    }

    if(resolve === 'all') {
      resolved.push(...(await cheapResolve({ json: rootJson })))
    }

    resolved.push(...(await cheapResolve({ json: pkg.dist.json })))

    const next = {
      ...pkg.dist.json,
      dependencies: {},
      peerDependencies: {},
    }

    resolved
      .sort()
      .filter((d, i, a) => a.indexOf(d) === i)
      .forEach((dep) => {
      const pkg = packages.find(p => p.dist.json.name === dep)
      const allPkg = allPackages.find(p => p.dist.json.name === dep) || { dist: { json: { version: null } } }
      const pkgVersion = (pkg ? pkg.dist.json.version : allPkg.dist.json.version)
      const detectedVersion = (pkgVersion) ? '^' + pkgVersion : pkgVersion
      const version = (peerDependencies[dep] || dependencies[dep] || detectedVersion || rootDependencies[dep])

      if(version) {
        if (peerDependencies[dep]) {
          next.peerDependencies[dep] = version
        } else {
          next.dependencies[dep] = version
        }
      } else {
          cli.error('Missing dependency: ' + dep)
          throw new Error('Missing dependency')
      }
    })

    pkg.dist.oldJson = pkg.dist.json
    pkg.dist.json = next
  }))
}

export default async function resolvePackages({ packages, allPackages, root, global }) {
  cli.info('Resolving dependencies for packages')

  try {
    await injectDependencies({root, allPackages, packages, global})
  } catch(err) {
    cli.error('An error occurred while resolving dependencies')
    return false
  }

  return true
}
