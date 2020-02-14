import cli from 'cli'

import { run } from 'script/run'

/** Command function **/
export async function releaseCommand({ packages, quiet, global }) {
  const pkgs = await run({ packages, scripts: ['release'], quiet, prefix: true, global })

  if(!pkgs.length) {
    cli.info(`No package implements script 'release', nothing to run`)
  }
}
