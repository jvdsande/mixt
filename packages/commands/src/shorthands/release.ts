import cli from 'cli'

import { run } from 'script/run'

/** Command function **/
export async function releaseCommand({ packages, quiet, global, allPackages, root }) {
  const pkgs = await run({ packages, scripts: ['release'], quiet, prefix: true, global, allPackages, root })

  if(!pkgs.length) {
    cli.info(`No package implements script 'release', nothing to run`)
  }
}
