import cli from 'cli'
import depcheck from 'depcheck'
import path from 'path'

import Command, { options } from '../command'

import {getJson, saveJson} from '../utils/file'
import {cleanPackagesDirectory, getGlobalPackages, getLocalPackages, getPackages} from '../utils/package'

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
  return Object.keys(packageJson.dependencies)
}

export async function resolvePackage({
  pkg,
  packagesDir,
  localPackages,
  globalPackages,
  cheap,
}) {
  const projectDir = pkg.startsWith('/') ? pkg : path.resolve(packagesDir, pkg)

  const projectJson = path.resolve(projectDir, 'package.json')

  const packageJson = getJson(projectJson)
  packageJson.dependencies = packageJson.dependencies || {}

  cli.info('Checking package ' + projectDir)

  // Check the dependencies of the provided package
  const using = cheap ? await cheapResolve({ packageJson }) : await fullResolve({ projectDir })

  let missing = false

  using.forEach(m => {
    const oldDep = packageJson.dependencies[m] !== '*' ? packageJson.dependencies[m] : null
    packageJson.dependencies[m] = oldDep || localPackages[m] || globalPackages[m]

    if(!packageJson.dependencies[m]) {
      cli.error('Missing dependency: ' + m)
      missing = true
    } else if(!oldDep) {
      cli.info('Added dependency ' + m + ' with version ' + packageJson.dependencies[m])
    } else if(oldDep !== packageJson.dependencies[m]) {
      cli.info('Updated dependency ' + m + ' to version ' + packageJson.dependencies[m])
    }
  })

  await saveJson(projectJson, packageJson)

  if(!missing) {
    cli.ok('Project up to date')
  }
}


/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages, cheap,
}) {
  await cleanPackagesDirectory(sourcesDir, packagesDir)

  const pkgs = packages && packages.length ? packages : (await getPackages(packagesDir)).map(p => p.json.name)

  cli.info('Checking ' + pkgs.length + ' packages')

  const localPackages = await getLocalPackages(packagesDir)
  const globalPackages = await getGlobalPackages(rootDir)

  for(const pkg of pkgs) {
    await resolvePackage({
      pkg,
      packagesDir,
      localPackages,
      globalPackages,
      cheap,
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
