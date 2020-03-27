import path from 'path'
import { fileUtils, resolveUtils } from '@mixt/utils'

export async function getCommonAndLocalDeps({ pkg, resolve, allPackages }) {
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
    resolved.push(...(await resolveUtils.fullResolve({ path: pkg })))
  }

  resolved.push(...(await resolveUtils.cheapResolve({ json })))

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

export async function getCommonNestedDeps({ packages, packageLock, dependencies = [] }) {
  if(!packageLock.dependencies) {
    return
  }

  while(packages.length) {
    const current = [...packages]
    packages.length = 0
    current.forEach(pkg => {
      // Add dependency
      dependencies.push(pkg)

      const dep = Object.entries(packageLock.dependencies).find(([d]) => d === pkg)

      if(!dep) {
        return
      }

      // Check pkg deps
      const info : any = dep[1]

      const requires = Object.keys(info.requires || {})

      requires.forEach(dep => {
        if(!dependencies.includes(dep)) {
          packages.push(dep)
        }
      })

      getCommonNestedDeps({
        packages: requires,
        packageLock: info,
        dependencies,
      })
    })
  }

  return dependencies
}
