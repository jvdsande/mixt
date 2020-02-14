import cli from 'cli'

import { releaseCommand } from 'shorthands/release'

export default async function releasePackages({ packages, global, quiet }) {
  cli.info('Executing release script')

  try {
    await releaseCommand({
      packages,
      global,
      quiet,
    })
  } catch(err) {
    cli.error('An error occurred during release, reverting versions')
    return false
  }

  return true
}
