import cli from 'cli'
import fs from "fs"
import path from "path"
import { getJson, readDir } from './file'
import { spawnCommand } from './process'

export async function getLocalPackages (packagesDir) {
  const packages = await readDir(packagesDir)

  const packagesJson = []

  await Promise.all(packages.map(async p => {
    if(p.startsWith('@')) {
      const scoped = await readDir(path.resolve(packagesDir, p))

      const scopedJson = await Promise.all(scoped.map(async s => getJson(path.resolve(packagesDir, p, s, 'package.json')).catch(err => {})))

      return packagesJson.push(...scopedJson)
    }
    try {
      const json = await getJson(path.resolve(packagesDir, p, 'package.json'))

      packagesJson.push(json)
    } catch(err) {}
  }))

  const modules = {}

  packagesJson.forEach(json => {
    if(json) {
      modules[json.name] = '^' + json.version
    }
  })

  return modules
}

export async function getGlobalPackages(rootDir) {
  const rootJson = await getJson(path.resolve(rootDir, 'package.json'))

  return rootJson.dependencies
}

export async function getPackages(sourceDir) {
  const sourceDirChild = await readDir(sourceDir)
  const pkgFolders = sourceDirChild.filter(pkg => {
    return fs.lstatSync(path.resolve(sourceDir, pkg)).isDirectory() && fs.existsSync(path.resolve(sourceDir, pkg, 'package.json'))
  })

  // Go through scoped packages
  await Promise.all(sourceDirChild.filter(pkg => pkg.startsWith('@'))
    .map(async scope => {
      const scopeFolders = (await readDir(path.resolve(sourceDir, scope))).filter(pkg => {
        return fs.lstatSync(path.resolve(sourceDir, scope, pkg)).isDirectory() && fs.existsSync(path.resolve(sourceDir, scope, pkg, 'package.json'))
      })

      pkgFolders.push(...scopeFolders.map(f => scope + '/' + f))
    })
  )

  return (await Promise.all(pkgFolders.map(async pkgFolder => {
    const json = await getPackageJson(sourceDir, pkgFolder)

    return {
      cwd: path.resolve(sourceDir, pkgFolder),
      json
    }
  })))
}


export async function getPackagesBySource(packages, sourcesDir) {
  console.log({
    packages,
    sourcesDir
  })

  const packagesBySource = await Promise.all(sourcesDir.map(async source => {
    const srcPkgs = await getPackages(source)

    return {
      source,
      packages: srcPkgs.filter(pkg => {
        return !packages || !packages.length || (packages.indexOf(pkg.json.name) > -1)
      })
    }
  }))

  const nb = packagesBySource.reduce((acc, src) => acc + src.packages.length, 0)

  if(!nb) {
    cli.fatal("Found 0 package for the given sources and packages name. Aborting.")
  }

  return packagesBySource
}

export async function getPackageJson(source, pkg) {
  if(pkg) {
    return await getJson(path.resolve(source, `./${pkg}`, './package.json'))
  } else {
    return await getJson(path.resolve(source, './package.json'))
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
    .map(source => path.resolve(packagesDir, './' + source))
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
