import { getConfig } from './utils/config'

export default function Command(program, {
    name,
    description,
    options = [],
    command,
  }) {
  let cmd = program
    .command(name)

  if(!options.find(opt => opt[0].startsWith('-r'))) {
    cmd = cmd.option('-r, --root [root]', 'Root package directory')
  }

  if(!options.find(opt => opt[0].startsWith('-p'))) {
    cmd = cmd.option('-p, --packages [packages]', 'Directory containing the local modules')
  }

  if(!options.find(opt => opt[0].startsWith('-s'))) {
    cmd = cmd.option('-s, --sources [sources]', 'Comma-separated list of source folders (subdirectory of packages)')
  }

  options.forEach(opt => {
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

    const config = await getConfig(cmd)

    await command({
      ...cmd,
      ...config,
      ...commandArgs,
    }, args)
  })
}
