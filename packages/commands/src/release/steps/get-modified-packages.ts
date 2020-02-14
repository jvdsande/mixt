import cli from 'cli'

import {getStatus} from 'release/status'

export default async function getModifiedPackages({ root, packages, all, commit }) {
  // Get a list of modified packages
  const modifiedPackages = await getStatus({
    root, packages, all, check: commit,
  })

  if(!modifiedPackages.length) {
    cli.info('All packages are up to date!')
    process.exit(0)
  }

  return modifiedPackages
}
