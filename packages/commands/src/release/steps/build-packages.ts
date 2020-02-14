import cli from 'cli'
import { buildCommand } from 'shorthands/build'

export default async function buildPackages({ packages, build, quiet, global }) {
  if(!build) {
    return true
  }

  cli.info('Building packages before release')

  try {
    await buildCommand({
      packages,
      global,
      quiet,
    })
  } catch(err) {
    cli.error('An error occurred during build, aborting release')
    return false
  }

  return true
}
