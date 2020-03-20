import cli from 'cli'

import { gitUtils } from '@mixt/utils'

export default async function validateRepository({ root, git }) {
  const repo = gitUtils.repository(root)

  const isRepo = await repo.checkIsRepo()

  if(isRepo) {
    const branch = await repo.branch(['--no-color'])

    if(branch.current !== git.branch) {
      cli.fatal(`Cannot publish from branch "${branch.current}", please checkout "${git.branch}" before publishing`)
    }
  }

  return isRepo ? repo : null
}
