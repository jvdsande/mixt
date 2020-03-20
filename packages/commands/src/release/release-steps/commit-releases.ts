import cli from 'cli'

import { processUtils } from '@mixt/utils'

export default async function commitReleases({ repo, packages, tag, git, commit }) {
  if(!repo || !commit) {
    return
  }

  // Create release commit
  await Promise.all(packages.map(async pkg => {
    await repo.add(pkg.src.path)
  }))

  await repo.commit("[Release] " + packages.map(pkg => pkg.src.json.name + '-' + pkg.src.json.version).join(','))

  if(!tag) {
    return
  }

  // Create tags for each released packages
  cli.info("Creating git tags...")

  const tagTriggers = packages.map(pkg => async() => {
    try {
      await repo.addAnnotatedTag(
        `${git.tagPrefix}${git.tagPrefix !== '' ? '-' : ''}${pkg.src.json.name}@${pkg.src.json.version}`,
        `${pkg.src.json.name}: v${pkg.src.json.version}`
      )
    } catch (err) {
      cli.error(`A tag with this version name already exists: ${pkg.src.json.name}@${pkg.src.json.version}. It has not been overwritten`)
    }
  })

  await processUtils.chainedPromises(tagTriggers)
  cli.info("Git tags created")
}
