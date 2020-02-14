import cli from 'cli'
import path from "path"
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

async function injectDependencies({ root, allPackages, packages, global, kind }) {
  const rootJson = await fileUtils.getJson(path.resolve(root, 'package.json'))
  const rootDependencies = {
    ...(rootJson.peerDependencies || {}),
    ...(rootJson.dependencies || {}),
  }

  await Promise.all(packages.map(async (pkg) => {
    const resolve = pkg.options.resolve || global.resolve
    const peerDependencies = pkg[kind].json.peerDependencies || {}
    const dependencies = pkg[kind].json.dependencies || {}

    const resolved = []
    if(resolve === 'full') {
      resolved.push(...(await fullResolve({ path: pkg[kind].path })))
    }

    resolved.push(...(await cheapResolve({ json: pkg[kind].json })))

    const next = {
      ...pkg[kind].json,
      dependencies: {},
      peerDependencies: {},
    }

    resolved.sort().forEach((dep) => {
      const pkg = packages.find(p => p.dist.json.name === dep)
      const allPkg = allPackages.find(p => p.dist.json.name === dep) || { dist: { json: { version: null } } }
      const pkgVersion = (pkg ? pkg.dist.json.version : allPkg.dist.json.version)
      const detectedVersion = (pkgVersion) ? '^' + pkgVersion : pkgVersion
      const version = (detectedVersion || peerDependencies[dep] || dependencies[dep] || rootDependencies[dep])

      if(version) {
        if (peerDependencies[dep]) {
          next.peerDependencies[dep] = version
        } else {
          next.dependencies[dep] = version
        }
      } else {
        if(kind === 'dist') {
          cli.error('Missing dependency: ' + dep)
          throw new Error('Missing dependency')
        }
      }
    })

    pkg[kind].oldJson = pkg[kind].json
    pkg[kind].json = next
  }))
}

export default async function resolvePackages({ packages, allPackages, root, global }) {
  cli.info('Resolving dependencies for packages')

  try {
    await injectDependencies({root, allPackages, packages, global, kind: 'dist'})
    await injectDependencies({root, allPackages, packages, global, kind: 'src'})
  } catch(err) {
    cli.error('An error occurred while resolving dependencies')
    return false
  }

  return true
}
