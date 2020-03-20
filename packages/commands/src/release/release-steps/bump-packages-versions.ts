import cli from 'cli'
import cliAsk from 'inquirer'
import semver from 'semver'

import { processUtils } from '@mixt/utils'

async function bump({ pkg }) {
  const { json } = pkg.src

  const version = json.version || '0.0.0'

  // Check if the current version is a prerelease
  const prerelease = semver.prerelease(version)

  const nextMajor = semver.inc(version, 'major')
  const nextMinor = semver.inc(version, 'minor')
  const nextPatch = semver.inc(version, 'patch')
  let betaMajor = semver.inc(version, 'premajor', 'alpha')
  let betaMinor = semver.inc(version, 'preminor', 'alpha')
  let betaPatch = semver.inc(version, 'prepatch', 'alpha')

  if (prerelease && prerelease.length) {
    const patch = semver.patch(version)
    const minor = semver.minor(version)
    const major = semver.major(version)

    const wasNotPatched = Number(patch) === 0
    const wasNotMinored = Number(minor) === 0

    // Only update the prerelease of patch
    betaPatch = major + '.' + minor + '.' + patch + '-' + prerelease[0] + '.' + (Number(prerelease[1]) + 1)

    // If we were already on a stable major, only update the prerelease of major
    if (wasNotPatched && wasNotMinored) {
      betaMajor = betaPatch
    }

    // If we were on a stable minor, only update the prerelease of minor
    if (wasNotPatched && wasNotMinored) {
      betaMinor = betaPatch
    }
  }

  const privateMsg = `\n(${json.name} is private and will not be published to NPM)`

  let nextVersion = await cliAsk.prompt([{
    name: 'version',
    type: 'list',
    message: `Select the new version for "${json.name}" (current version: ${version}) ${json.private ? privateMsg : ''}`,
    default: 0,
    choices: [nextPatch, nextMinor, nextMajor, 'Custom', betaPatch, betaMinor, betaMajor, 'Do not release'],
    pageSize: 10,
  }])

  while (nextVersion.version === 'Custom') {
    const customVersion = await cliAsk.prompt([{
      name: 'version',
      type: 'string',
      message: 'Enter a custom version',
    }])

    if (semver.valid(customVersion.version)) {
      nextVersion = customVersion
    } else {
      cli.error('Invalid version.')
    }
  }

  pkg.src.json.version = nextVersion.version
  pkg.dist.json.version = nextVersion.version
}

export default async function bumpPackagesVersions({ modifiedPackages }) {
  const bumpTriggers = modifiedPackages.map(pkg => async () => {
    pkg.oldSrcJson = JSON.parse(JSON.stringify(pkg.src.json))
    pkg.oldDistJson = JSON.parse(JSON.stringify(pkg.dist.json))

    await bump({ pkg })
  })

  await processUtils.chainedPromises(bumpTriggers)

  const toReleasePackages = modifiedPackages.filter(pkg => pkg.src.json.version !== 'Do not release')

  if (!toReleasePackages.length) {
    cli.info('No package to release')
    process.exit(0)
  }

  return toReleasePackages
}
