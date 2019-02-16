import cli from 'cli'
import fs from "fs"
import { resolve } from "path"
import { getJson, readDir } from './file'
import { spawnCommand } from './process'

export async function getLocalPackages (packagesDir) {
  const packages = await readDir(packagesDir)

  const packagesJson = await Promise.all(packages.map(p => getJson(resolve(packagesDir, p, 'package.json')).catch(err => {})))

  const modules = {}

  packagesJson.forEach(json => {
    if(json) {
      modules[json.name] = '^' + json.version
    }
  })

  return modules
}

export async function getGlobalPackages(rootDir) {
  const rootJson = getJson(resolve(rootDir, 'package.json'))

  return rootJson.dependencies
}

export async function getPackages(sourceDir) {
  const pkgFolders = (await readDir(sourceDir)).filter(pkg => {
    return fs.lstatSync(resolve(sourceDir, pkg)).isDirectory() && fs.existsSync(resolve(sourceDir, pkg, 'package.json'))
  })

  return (await Promise.all(pkgFolders.map(async pkgFolder => {
    const json = await getPackageJson(sourceDir, pkgFolder)
    return {
      cwd: resolve(sourceDir, pkgFolder),
      json
    }
  })))
}


export async function getPackagesBySource(packages, sourcesDir) {
  return await Promise.all(sourcesDir.map(async source => {
    const srcPkgs = await getPackages(source)

    return {
      source,
      packages: srcPkgs.filter(pkg => !packages || !packages.length || (packages.indexOf(pkg.json.name) > -1))
    }
  }))
}

export async function getPackageJson(source, pkg) {
  if(pkg) {
    return await getJson(resolve(source, `./${pkg}`, './package.json'))
  } else {
    return await getJson(resolve(source, './package.json'))
  }
}

export function getSources(srcs, packagesDir, init) {
  const sources = (srcs).split(',')
    .filter(source => {
      if(source === 'node_modules') {
        cli.info('You cannot use node_modules as source. Ignoring...')
        return false
      }

      return true
    })
    .map(source => resolve(packagesDir, './' + source))
    .filter(source => {
      if(!init && !fs.existsSync(source)) {
        cli.info('Source dir "' + source + '" could not be found. Ignoring...')
        return false
      }

      return true
    })

  if(!sources.length) {
    cli.fatal('Cannot run command with an empty sources directory list')
  }

  return sources
}


export async function cleanPackagesDirectory(sourcesDir, packagesDir) {
  const packagesBySourcesDir = await getPackagesBySource([], sourcesDir)

  const currentlyBuiltPackages = await getLocalPackages(packagesDir)

  const expiredPackages = []

  Object.keys(currentlyBuiltPackages).forEach(pkg => {
    const found = packagesBySourcesDir.find(source => !!source.packages.find(p => p.json.name === pkg))

    if(!found) {
      expiredPackages.push(pkg)
    }
  })

  await Promise.all(expiredPackages.map(pkg => {
    cli.info('Cleaning package ' + JSON.stringify(pkg))
    return spawnCommand('rm', ['-rf', pkg], { cwd: packagesDir }, true)
  }))
}
