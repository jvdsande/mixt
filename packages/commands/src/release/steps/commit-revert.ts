import cli from 'cli'

export default async function commitRevert({ packages, repo }) {
  if(!repo) {
    return
  }

  await Promise.all(packages.map(async pkg => {
    await repo.add(pkg.src.path)
  }))
  await repo.commit("[Post-Release] " + packages.map(pkg => pkg.src.json.name + '-' + pkg.src.json.version).join(','))

  cli.info("Pushing changes...")
  try {
    await repo.push()
    await repo.pushTags()
  } catch(err) {
    cli.error('An error occurred while pushing changes')
    cli.error(err)
  }
}
