import { promisify } from 'util'
import simpleGit from 'simple-git'

export function repository(rootDir) {
  const git = simpleGit(rootDir)

  const tags = promisify(git.tags.bind(git))
  const raw = promisify(git.raw.bind(git))

  return ({
    git,
    checkIsRepo: promisify(git.checkIsRepo.bind(git)),
    branch: promisify(git.branch.bind(git)),
    addTag: promisify(git.addTag.bind(git)),
    addAnnotatedTag: promisify(git.addAnnotatedTag.bind(git)),
    add: promisify(git.add.bind(git)),
    commit: promisify(git.commit.bind(git)),
    push: promisify(git.push.bind(git)),
    pushTags: promisify(git.pushTags.bind(git)),
    tag: promisify(git.addTag.bind(git)),
    status: promisify(git.status.bind(git)),
    diffSummary: promisify(git.diffSummary.bind(git)),
    diff: promisify(git.diff.bind(git)),
    fetch: promisify(git.fetch.bind(git)),
    tags,
    raw,
    latestTag: async function() {
      const allTags = await tags()

      if(!allTags.all.length) {
        return
      }

      try {
        const tag = (await raw([
          'describe', '--tags', '--abbrev=0', '--match', 'mixt-head*'
        ])).trim()

        return tag !== '' ? tag : undefined
      } catch(err) {
      }
    },
  })
}

