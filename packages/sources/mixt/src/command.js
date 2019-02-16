import { getConfig } from './utils/config'

function parseConfig(config) {
  if(config === undefined) {
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
  config:  ['-c, --config [config]', 'How to generate config file. "true" generates a "mixt.json" file. "embed" adds the config to "package.json". "false" does not store configuration.', parseConfig, true],
  root:  ['-r, --root [root]', 'Root package directory'],
  packages:  ['-p, --packages [packages]', 'Directory containing the local modules'],
  sources:  ['-s, --sources [sources]', 'Comma-separated list of source folders (subdirectory of packages)'],
  noBuild:  ['-B, --no-build', 'Do not build packages before publishing (not recommended)'],
  noResolve:  ['-R, --no-resolve', 'Whether to run the resolve command after building'],
  noTag:  ['-T, --no-tag', 'Do not add Git tag after publishing'],
  quietBuild:  ['-q, --quiet-build', 'Turn off logging for build scripts'],
  branch: ['--branch [branch]', 'Specify the Git branch from which publishing is allowed. Defaults to "master"'],
  cheap:  ['--cheap', 'Whether to use the cheap resolve function. Defaults to false.'],
  source: ['--source [source]', 'Source folder to use (subdirectory of packages)'],
  prefix: ['--prefix [prefix]', 'Append a custom prefix for generated Git tags']
}


export default function Command(program, {
    name,
    description,
    options: passedOptions = [],
    command,
    loadConfig = true,
  }) {
  let cmd = program
    .command(name)
    .option(...options.root)
    .option(...options.packages)
    .option(...options.sources)

  passedOptions.forEach(opt => {
    cmd = cmd.option(...opt)
  })

  cmd.action(async function(...args) {
    const cmd = args.pop()
    const commandArgNames = (name.match(/[[<]([a-zA-Z0-9]+)[\]>]/g) || []).map(s => (s.match(/[a-zA-Z0-9]+/g) || [])[0])

    const restArgs = (name.match(/[[<]([a-zA-Z0-9]+\.\.\.)[\]>]/g) || []).map(s => (s.match(/[a-zA-Z0-9]+/g) || [])[0])

    const commandArgs = {}
    commandArgNames.forEach(n => commandArgs[n] = args.shift())

    if(restArgs && restArgs[0]) {
      commandArgs[restArgs[0]] = args[0]
    }

    const config = await getConfig(cmd, loadConfig)

    await command({
      ...cmd,
      ...config,
      ...commandArgs,
    }, args)
  })
}
