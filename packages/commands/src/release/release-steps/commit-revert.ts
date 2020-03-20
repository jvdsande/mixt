import cli from 'cli'

export default async function commitRevert({ repo, packages, tag, git, commit }) {
  if(!repo || !commit) {
    return
  }

  // Create post-release commit
  await Promise.all(packages.map(async pkg => {
    await repo.add(pkg.src.path)
  }))
  await repo.commit("[Post-Release] " + packages.map(pkg => pkg.src.json.name + '-' + pkg.src.json.version).join(','))

  // Create post-release tag
  if(tag) {
    cli.info("Creating Mixt head tag...")
    try {
      await repo.addAnnotatedTag(
        `${git.tagPrefix}${git.tagPrefix !== '' ? '-' : ''}mixt-head@${new Date().valueOf()}`,
        'Mixt head tag',
      )
    } catch(err) {
      cli.error('An error occurred while creating head tag')
      cli.error(err)
    }
  }

  cli.info("Pushing changes...")
  try {
    await repo.push()
    await repo.pushTags()
  } catch(err) {
    cli.error('An error occurred while pushing changes')
    cli.error(err)
  }
}
