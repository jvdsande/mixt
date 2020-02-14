import cli from 'cli'

import { configUtils } from '@mixt/utils'

function parseConfig(config) {
  if(config === undefined || config === true || config === 'true') {
    return true
  }

  if(config === false || config === 'false') {
    return false
  }

  if(config === 'embed' || config === 'embedded') {
    return 'embed'
  }
}

export const options = {
  config:  ['-c, --config <config>', 'How to generate config file. "true" generates a "mixt.json" file. "embed" adds the config to "package.json". "false" does not store configuration.', parseConfig, true],
  sources:  ['-s, --sources <sources>', 'Comma-separated list of source folders. Your packages needs to be direct children of a source'],
  noBuild:  ['-B, --no-build', 'Do not build packages before releasing (not recommended)'],
  noTag:  ['-T, --no-tag', 'Do not add Git tag after releasing'],
  noCommit: ['-C, --no-commit', 'Do not commit release to Git, only run scripts. Automatically adds "no-tag" flag'],
  quiet:  ['-q, --quiet', 'Turn off logging for scripts'],
  dist:  ['-d, --dist <dist>', 'Subdirectory holding the built package. Defaults to ./'],
  resolve:  ['-r, --resolve <resolve>', 'Resolve method to use from full|cheap|all|none. Defaults to full'],
  prefix:  ['-p, --prefix <prefix>', 'Prefix for preferred npm scripts. Defaults to mixt:'],
  gitBranch: ['-b, --git-branch <branch>', 'Specify the Git branch from which publishing is allowed. Defaults to "master"'],
  gitTagPrefix: ['-t, --git-tag-prefix <tagPrefix>', 'Append a custom prefix for generated Git tags. Defaults to none'],
  all: ['-a, --all', 'Whether to release packages that have not changed on Git'],
}


export default function Command(program, {
    name,
    options: passedOptions = [],
    command,
    init = false,
  }) {
  let cmd = program
    .command(name)
    .option(...options.sources)

  passedOptions.forEach(opt => {
    cmd = cmd.option(...opt)
  })

  cmd.action(async function(...args) {
    const cmd = args.pop()
    const commandArgNames = (name.match(/[[<]([a-zA-Z0-9]+)[\]>]/g) || []).map(s => (s.match(/[a-zA-Z0-9]+/g) || [])[0])

    const restArgs = (name.match(/[[<]([a-zA-Z0-9]+)\.\.\.[\]>]/g) || []).map(s => (s.match(/[a-zA-Z0-9]+/g) || [])[0])

    const commandArgs = {}
    commandArgNames.forEach(n => commandArgs[n] = args.shift())

    if(restArgs && restArgs[0]) {
      commandArgs[restArgs[0]] = args[0]

      if(restArgs[0] === 'packages') {
        cmd.packages = args[0]
      }
    }

    const config = await configUtils.getConfig(cmd, init)

    try {
      await command({
        ...cmd,
        ...commandArgs,
        ...config,
      }, args)
    } catch(err) {
      cli.fatal(err)
    }
  })
}
