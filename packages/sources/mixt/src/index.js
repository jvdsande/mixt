import program from 'commander'

import AddCommand from './commands/add'
import BuildCommand from './commands/build'
import CleanCommand from './commands/clean'
import ExecCommand from './commands/exec'
import InitCommand from './commands/init'
import PublishCommand from './commands/publish'
import ResolveCommand from './commands/resolve'
import RunCommand from './commands/run'
import StatusCommand from './commands/status'
import WatchCommand from './commands/watch'

InitCommand(program)
AddCommand(program)
ResolveCommand(program)
BuildCommand(program)
WatchCommand(program)
CleanCommand(program)
StatusCommand(program)
PublishCommand(program)
RunCommand(program)
ExecCommand(program)

export const run = async () => {
  program.parse(process.argv)
}
