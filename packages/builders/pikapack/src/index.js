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
      // Check if @pika/pack is installed globally
      try {
        await process.spawnProcess('pika', true)
      } catch(err) {
        cli.error("@pika/pack needs to be installed globally in order to use this builder.")
        cli.error("Please run `npm i -g @pika/pack` and try again")

        return false
      }

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
