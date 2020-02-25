import cli from 'cli'
import { buildCommand } from 'shorthands/build'

export default async function buildPackages({ packages, build, quiet, global, allPackages, root }) {
  if(!build) {
    return true
  }

  cli.info('Building packages before release')

  try {
    await buildCommand({
      packages,
      global,
      quiet,
      allPackages,
      root
    })
  } catch(err) {
    cli.error('An error occurred during build, aborting release')
    cli.error(err)
    return false
  }

  return true
}
