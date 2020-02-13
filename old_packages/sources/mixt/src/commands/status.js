import cli from 'cli'
import path from 'path'
import Command from '../command'
import { Git } from '../utils/git'
import { getPackagesBySource } from '../utils/package'

/** Private functions **/
export async function getStatus({
  rootDir, sourcesDir, packages, force,
}) {
  const git = new Git(rootDir)

  const isRepo = await git.checkIsRepo()

  const packagesBySource = await getPackagesBySource(packages, sourcesDir)

  const modifiedPackages = []

  if(isRepo) {
    cli.info("Git repository found. Checking for modified files...")

    const status = await git.status()

    if(status.files.length) {
      cli.fatal("Found uncommitted work. Please commit before running the publish command!")
    }

    await git.fetch()
    const tag = await git.latestTag()

    if(tag !== undefined) {
      // Check against tag
      const diff = (await git.diff([tag, '--stat', '--', ...sourcesDir])).split('\n')
        .map(l => (l.match(/^ ([\S]*)/) || [])[1])
        .filter(l => !!l)
        .map(l => path.resolve(rootDir, l))

      // Get rid of total
      diff.pop()

      packagesBySource.forEach(source => {
        source.packages.forEach(pkg => {
          const found = diff.find(d => d.startsWith(pkg.cwd))

          if(found || force) {
            modifiedPackages.push({
              source,
              ...pkg
            })
          }
        })
      })

    } else {
      packagesBySource.forEach(source => {
        source.packages.forEach(pkg => {
          modifiedPackages.push({
            source,
            ...pkg
          })
        })
      })
    }
  } else {
    cli.info("No git repository found. All projects are marked as 'changed'")

    packagesBySource.forEach(source => {
      source.packages.forEach(pkg => {
        modifiedPackages.push({
          source,
          ...pkg
        })
      })
    })
  }

  return modifiedPackages;
}

/** Command function **/
export async function command({
  rootDir, packagesDir, sourcesDir, packages,
}) {
  const modifiedPackages = await getStatus({
    rootDir, packagesDir, sourcesDir, packages,
  })

  modifiedPackages.forEach(pkg => {
    cli.info(` *  "${pkg.json.name}" has been modified since last release`)
  })

  if(!modifiedPackages.length) {
    cli.info('All packages are up to date!')
  }
}

/** Command export */
export default function StatusCommand(program) {
  Command(program, {
    name: 'status [packages...]',
    command,
  })
}
