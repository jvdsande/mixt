import path from 'path'
import program from 'commander'

import { fileUtils } from '@mixt/utils'

import { ManagementCommands, ScriptCommands, ReleaseCommands, ShorthandsCommands } from '@mixt/commands'

[...ManagementCommands, ...ScriptCommands, ...ReleaseCommands, ...ShorthandsCommands]
  .forEach(c => c(program))

export const run = async () => {
  try {
    const json = await fileUtils.getJson(path.resolve(process.mainModule.filename, "../../", "package.json"))
    program.version(json.version)
  } catch (err) {

  }
  program.parse(process.argv)
}
