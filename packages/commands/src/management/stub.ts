import path from 'path'
import cli from 'cli'

import { fileUtils, processUtils } from '@mixt/utils'

import Command from 'command'

/** Command function **/
async function command({
  packages,
}) {
  const stubTriggers = packages.map(pkg => async () => {
    if(!pkg.dist.exists) {
      cli.info(`Creating stub for package ${pkg.name}`)
      await fileUtils.mkdir(pkg.dist.path)
      await fileUtils.saveJson(path.resolve(pkg.dist.path, 'package.json'), { name: pkg.src.json.name })
    } else {
      cli.info(`Package ${pkg.name} already exists, no need to stub`)
    }
  })

  await processUtils.chainedPromises(stubTriggers)
}

/** Command export */
export default function StubCommand(program) {
  Command(program, {
    name: 'stub',
    command,
  })
}
