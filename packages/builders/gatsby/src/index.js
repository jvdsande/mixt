import cli from 'cli'
import path from 'path'

const gatsbyBuilder = {
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
      const args = ['build']
      if(options && options.usePrefix) {
        args.push('--prefix-paths')
      }

      let success = true

      success = success && await process.spawnCommand('gatsby', args, { cwd })
      success = success && await process.spawnCommand('cp', ['-rf', 'public', path.resolve(packagesDir, pkg.name)], { cwd })

      const publicJson = {
        name: pkg.name,
        version: pkg.version,
        author: pkg.author,
        description: pkg.description,
        keywords: pkg.keywords,
        private: pkg.private,
      }

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
      const args = ['develop']
      if(options && options.usePrefix) {
        args.push('--prefix-paths')
      }
      if(options && options.port) {
        args.push('-p')
        args.push(options.port)
      }

      let success = true

      success = success && await process.spawnCommand('gatsby', args, { cwd })

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
