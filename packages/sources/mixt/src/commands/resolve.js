import cli from 'cli'
import depcheck from 'depcheck'
import path from 'path'

import Command, { options } from '../command'

import {getJson, saveJson} from '../utils/file'
import {
  cleanPackagesDirectory,
  getGlobalPackages,
  getLocalPackages,
  getPackages,
  getPackagesBySource
} from '../utils/package'

/** Private functions */
async function fullResolve({ projectDir }) {
  return new Promise((resolve) => {
    const options = {
      ignoreBinPackage: false, // ignore the packages with bin entry
      skipMissing: false, // skip calculation of missing dependencies
    }

    depcheck(projectDir, options, async (unused) => {
      resolve(Object.keys(unused.using))
    })
  })
}

async function cheapResolve({ packageJson }) {
  return Object.keys({
    ...(packageJson.peerDependencies || {}),
    ...(packageJson.dependencies || {}),
  })
}

export async function resolvePackage({
  pkg,
  packagesDir,
  localPackages,
  globalPackages,
  cheap,
  resolver,
}) {
  if(resolver === "none") {
    cli.ok('Project up to date')

    return true
  }

  const projectDir = pkg.startsWith('/') ? pkg : path.resolve(packagesDir, pkg)

  const projectJson = path.resolve(projectDir, 'package.json')

  let packageJson

  try {
    packageJson = await getJson(projectJson)
  } catch(err) {
    cli.error(`Project ${pkg} could not be found. Did you build it first?`)
    return false
  }
  packageJson.dependencies = packageJson.dependencies || {}
  const peerDependencies = packageJson.peerDependencies || {}

  cli.info('Checking package ' + projectDir)

  // Check the dependencies of the provided package
  let using

  if(cheap || resolver === "cheap") {
    using = await cheapResolve({ packageJson })
  } else {
    using = await fullResolve({ projectDir })
  }

  let missing = false

  using.forEach(m => {
    const oldDep = packageJson.dependencies[m] !== '*' ? packageJson.dependencies[m] : null
    const peerDep = peerDependencies[m] !== '*' ? peerDependencies[m] : null
    const hasPeer = !!peerDependencies[m]

    // If the dep is already in "dependencies", keep the value
    // Else, if the dep is in "devDependencies", use this value
    // Else, check if we have this package locally, and take the value
    // Else, check if it is a dependency of the main package, and take the value
    const dependency = oldDep || peerDep || localPackages[m] || globalPackages[m]

    // If the package has the dep defined as a peer dep, do not set main dep, set peer dep
    if(hasPeer) {
      packageJson.peerDependencies = packageJson.peerDependencies || {}
      packageJson.peerDependencies[m] = dependency

      if(!dependency) {
        cli.error('Missing peer dependency: ' + m)
        missing = true
      } else if(!peerDep) {
        cli.info('Added peer dependency ' + m + ' with version ' + packageJson.dependencies[m])
      } else if(peerDep !== packageJson.peerDependencies[m]) {
        cli.info('Updated dependency ' + m + ' to version ' + packageJson.dependencies[m])
      }
    }
    // Else, set it as main dep
    else {
      packageJson.dependencies[m] = dependency

      if(!dependency) {
        cli.error('Missing dependency: ' + m)
        missing = true
      } else if(!oldDep) {
        cli.info('Added dependency ' + m + ' with version ' + packageJson.dependencies[m])
      } else if(oldDep !== packageJson.dependencies[m]) {
        cli.info('Updated dependency ' + m + ' to version ' + packageJson.dependencies[m])
      }
    }
  })

  await saveJson(projectJson, packageJson)

  if(!missing) {
    cli.ok('Project up to date')

    return true
  }

  return false
}


/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages, cheap,
}) {
  await cleanPackagesDirectory(sourcesDir, packagesDir)

  const pkgs = packages && packages.length ? packages : (await getPackages(packagesDir)).map(p => p.json.name)

  cli.info('Checking ' + pkgs.length + ' package' + (pkgs.length > 1 ? 's' : ''))

  const localPackages = await getLocalPackages(packagesDir)
  const globalPackages = await getGlobalPackages(rootDir)
  const packagesBySource = await getPackagesBySource(pkgs, sourcesDir)

  for(const pkg of pkgs) {
    let json = null;

    packagesBySource.forEach(source => {
      source.packages.forEach(p => {
        if(p.json.name === pkg) {
          json = p.json
        }
      })
    })

    await resolvePackage({
      pkg,
      packagesDir,
      localPackages,
      globalPackages,
      cheap,
      resolver: json && json.mixt && json.mixt.resolver
    })
  }
}

/** Command export */
export default function ResolveCommand(program) {
  Command(program, {
    name: 'resolve [packages...]',
    options: [
      options.cheap,
    ],
    command,
  })
}
