import cli from 'cli'
import path from 'path'
import commandExists from 'command-exists'

const gatsbyBuilder = {
  name: 'mixt-builder-gatsby',

  configure() {
    return ({
      builder: {
        name: 'gatsby',
        options: {
          usePrefix: false,
          port: 8000,
        }
      },
      resolver: 'none',
    })
  },

  async command({cwd, pkg, packagesDir, silent, utils: { process, file }, options}) {
    try {
      // Check if Gatsby is installed globally
      try {
        await commandExists('gatsby')
      } catch(err) {
        cli.error("gatsby needs to be installed globally in order to use this builder.")
        cli.error("Please run `npm i -g gatsby` and try again")

        return false
      }

      const args = ['build']
      if(options && options.usePrefix) {
        args.push('--prefix-paths')
      }

      let success = true

      success = success && await process.spawnCommand('gatsby', args, { cwd })
      try {
        await file.cp(path.resolve(cwd, 'public'), path.resolve(packagesDir, pkg.name))
      } catch(err) {
        return false
      }

      // Everything except dependencies and devDependencies
      // scripts and mixt entries are also irrelevant for published package
      const { dependencies, devDependencies, scripts, mixt, ...publicJson } = pkg

      try {
        await file.saveJson(path.resolve(packagesDir, pkg.name, 'package.json'), publicJson)
        return success
      } catch(err) {
        return false
      }
    } catch(err) {
      cli.error("An error occurred while building package " + JSON.stringify(pkg.name) + ": ")
      cli.error(err)
      return false
    }
  },

  async watch({cwd, pkg, packagesDir, silent, utils: { process, file }, options}) {
    try {
      // Check if Gatsby is installed globally
      try {
        await commandExists('gatsby')
      } catch(err) {
        cli.error("gatsby needs to be installed globally in order to use this builder.")
        cli.error("Please run `npm i -g gatsby` and try again")

        return false
      }

      const args = ['develop']
      if(options && options.usePrefix) {
        args.push('--prefix-paths')
      }

      if(options && options.port) {
        args.push('-p')
        args.push(options.port)
      }

      let success = true

      success = success && await process.spawnCommand(
        'gatsby',
        args,
        {
          cwd,
        }
      )

      return success
    } catch(err) {
      cli.error("An error occurred while building package " + JSON.stringify(pkg.name) + ": ")
      cli.error(err)
      return false
    }
  },

  async build({cwd, pkg, packagesDir, silent, utils, options}) {
    !silent && cli.info('Found Gatsby project. Building...')

    const done = await gatsbyBuilder.command({ cwd, pkg, packagesDir, silent, utils, options })

    done && !silent && cli.info('Done!')

    return done
  }
}

export default gatsbyBuilder
