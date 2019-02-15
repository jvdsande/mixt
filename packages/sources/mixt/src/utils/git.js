import simpleGit from 'simple-git'

function promisify(func) {
  return (...args) => new Promise((resolve, reject) => func(...args, (err, res) => err ? reject(err) : resolve(res)))
}

export class Git {
  constructor(rootDir) {
    this.git = simpleGit(rootDir)

    this.checkIsRepo = promisify(this.git.checkIsRepo.bind(this.git))
    this.branch = promisify(this.git.branch.bind(this.git))
    this.addTag = promisify(this.git.addTag.bind(this.git))
    this.add = promisify(this.git.add.bind(this.git))
    this.commit = promisify(this.git.commit.bind(this.git))
    this.push = promisify(this.git.push.bind(this.git))
    this.pushTags = promisify(this.git.pushTags.bind(this.git))
    this.tag = promisify(this.git.addTag.bind(this.git))
    this.status = promisify(this.git.status.bind(this.git))
    this.diffSummary = promisify(this.git.diffSummary.bind(this.git))
    this.diff = promisify(this.git.diff.bind(this.git))
    this.fetch = promisify(this.git.fetch.bind(this.git))
    this.tags = promisify(this.git.tags.bind(this.git))
    this.raw = promisify(this.git.raw.bind(this.git))
    this.latestTag = async function() {
      const tags = await this.tags()

      if(!tags.all.length) {
        return
      }

      try {
        const tag = (await this.raw([
          'describe', '--tags'
        ])).trim()

        return tag !== '' ? tag : undefined
      } catch(err) {
      }
    }
  }
}
