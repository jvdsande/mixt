import path from 'path'
import cli from 'cli'

import { fileUtils } from '@mixt/utils'

import Command from 'command'

/** Command function **/
async function command({
  packages,
}) {
  packages.forEach(pkg => {
    if(!pkg.dist.exists) {
      cli.info(`Creating stub for package ${pkg.name}`)
      fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), { name: pkg.src.json.name })
    } else {
      cli.info(`Package ${pkg.name} already exists, no need to stub`)
    }
  })
}

/** Command export */
export default function StubCommand(program) {
  Command(program, {
    name: 'stub',
    command,
  })
}
