import cli from 'cli'
import depcheck from 'depcheck'
import path from 'path'

import Command from '../command'

import { readFile, writeFile } from '../utils/file'
import {cleanPackagesDirectory, getGlobalPackages, getLocalPackages, getPackages} from '../utils/package'

/** Private functions */
export async function resolvePackage({
  pkg,
  packagesDir,
  localPackages,
  globalPackages,
}) {
  const projectDir = pkg.startsWith('/') ? pkg : path.resolve(packagesDir, pkg)

  const projectJson = path.resolve(projectDir, 'package.json')

  cli.info('Checking package ' + projectDir)

  // Check the dependencies of the provided package
  return new Promise((resolve) => {
    const options = {
      ignoreBinPackage: false, // ignore the packages with bin entry
      skipMissing: false, // skip calculation of missing dependencies
    }

    depcheck(projectDir, options, async (unused) => {
      const using = Object.keys(unused.using)

      const packageJson = JSON.parse(await readFile(projectJson, 'utf-8'))
      packageJson.dependencies = packageJson.dependencies || {}

      let missing = false

      using.forEach(m => {
        const oldDep = packageJson.dependencies[m]
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

      await writeFile(projectJson, JSON.stringify(packageJson, null, 2), 'utf-8')

      if(!missing) {
        cli.ok('Project up to date')
      }

      return resolve(true)
    })
  })
}


/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir,
  packages,
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
    })
  }
}

/** Command export */
export default function ResolveCommand(program) {
  Command(program, {
    name: 'resolve [packages...]',
    command,
  })
}
