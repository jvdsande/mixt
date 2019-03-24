import cli from 'cli'

const pikaPackBuilder = {
  name: 'mixt-builder-pika-pack',

  configure() {
    return ({
      builder: 'pika-pack',
    })
  },

  async command({cwd, pkg, packagesDir, silent, utils: { process }}) {
    try {
      return await process.spawnCommand(
        'pack',
        [...`build --out=../../node_modules/${pkg.name}`.split(' ')],
        { cwd },
        silent,
      )
    } catch(err) {
      cli.error("An error occurred while building package " + JSON.stringify(pkg.name) + ": ")
      cli.error(err)
      return false
    }
  },

  async build({cwd, pkg, packagesDir, silent, utils }) {
    !silent && cli.info('Found @pika/pack project. Building...')

    const done = await pikaPackBuilder.command({ cwd, pkg, packagesDir, silent, utils })

    done && !silent && cli.info('Done!')

    return done
  }
}

export default pikaPackBuilder
