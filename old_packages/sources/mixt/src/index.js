import path from 'path'
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
import { getJson } from './utils/file'
export { spawnCommand } from './utils/process'

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
  try {
    const json = await getJson(path.resolve(process.mainModule.filename, "../../", "package.json"))
    program.version(json.version)
  } catch (err) {

  }
  program.parse(process.argv)
}
