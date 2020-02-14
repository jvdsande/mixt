import cli from 'cli'
import path from 'path'

import { gitUtils } from '@mixt/utils'

import Command from 'command'

/** Helper functions **/
export async function getStatus({
  root, packages, all, check,
}) {
  const git = gitUtils.repository(root)

  const isRepo = await git.checkIsRepo()

  const modifiedPackages = []

  if(isRepo) {
    cli.info("Git repository found. Checking for modified files...")

    if(check) {
      const status = await git.status()

      if (status.files.length) {
        cli.fatal("Found uncommitted work. Please commit before running this command!")
      }
    }

    await git.fetch()
    const tag = await git.latestTag()

    if(tag !== undefined) {
      // Check against tag
      const diff = (await git.diff([tag, '--name-status', '--no-color'])).split('\n')
        .flatMap(diffLine => {
          // Get both old name and new name for renamed files
          const split = diffLine.split('\t')
          split.shift()
          return split
        })
        .filter(s => s)
        .map(s => path.resolve(root, s))

      packages.forEach(pkg => {
        const found = diff.find(d => d.startsWith(pkg.src.path))

        if(found || all) {
          modifiedPackages.push(pkg)
        }
      })
    } else {
      modifiedPackages.push(...packages)
    }
  } else {
    cli.info("No git repository found. All projects are marked as 'changed'")

    modifiedPackages.push(...packages)
  }

  return modifiedPackages;
}

/** Command function **/
export async function command({
  root, packages,
}) {
  const modifiedPackages = await getStatus({
    root, packages, all: false, check: true,
  })

  modifiedPackages.forEach(pkg => {
    cli.info(` *  "${pkg.src.json.name}" has been modified since last release`)
  })

  if(!modifiedPackages.length) {
    cli.info('All packages are up to date!')
  }
}

/** Command export */
export default function StatusCommand(program) {
  Command(program, {
    name: 'status [packages...]',
    command,
  })
}
