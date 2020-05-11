import cli from 'cli'

import { releaseCommand } from 'shorthands/release'

export default async function releasePackages({ packages, global, quiet }) {
  cli.info('Executing release script')

  // Separate packages between 'next' and 'latest'
  const next = []
  const latest = []

  packages.forEach(p => {
    if(p.dist.next) {
      next.push(p)
    } else {
      latest.push(p)
    }
  })

  try {
    // Release 'latest' packages
    if(latest.length) {
      cli.info('Releasing packages tagged with \'latest\'')
      await releaseCommand({
        packages: latest,
        global,
        quiet,
        allPackages: [],
        root: {},
      })
    }

    // Release 'next' packages
    if(next.length) {
      cli.info('Releasing packages tagged with \'next\'')
      await releaseCommand({
        packages: next,
        global,
        quiet,
        allPackages: [],
        root: {},
        options: '--tag next',
      })
    }
  } catch(err) {
    cli.error('An error occurred during release, reverting versions')
    return false
  }

  return true
}
