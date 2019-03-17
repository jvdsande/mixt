import path from 'path'
import { getJson } from './file'
import { getPackageJson, getSources} from './package'


export async function getMixtJson(source) {
  try {
    return await getJson(path.resolve(source, './mixt.json'))
  } catch(err) {
    return {}
  }
}

export async function getConfig(cmd, loadConfig) {
  const root      = cmd.root || './'
  const rootDir   = path.resolve(process.env.PWD, root)

  const config    = loadConfig ? await getMixtJson(rootDir) : {}
  const json      = loadConfig ? ((await getPackageJson(rootDir)).mixt || {}) : {}

  const packages  = cmd.packages || config.packages || json.packages || './packages'
  let packagesDir = packages.startsWith('/') ? packages : path.resolve(rootDir, packages)

  if(!packagesDir.endsWith('node_modules')) {
    packagesDir = path.resolve(packagesDir, './node_modules')
  }

  const configSources = config.sources ? config.sources.join(',') : null
  const jsonSources   = json.sources ? json.sources.join(',') : null

  const sourcesDir    = getSources(cmd.sources || configSources || jsonSources || 'sources', path.resolve(packagesDir, '../'), !loadConfig)
  const allSourcesDir = getSources(configSources || jsonSources || cmd.sources || 'sources', path.resolve(packagesDir, '../'), !loadConfig)

  const gitBranch     = cmd.branch || (config.git && config.git.branch) || (json.git && json.git.branch) || 'master'
  const gitTagPrefix  = cmd.tagPrefix || (config.git && config.git.tagPrefix) || (json.git && json.git.tagPrefix) || ''

  return {
    rootDir,
    packagesDir,
    sourcesDir,
    allSourcesDir,
    git: {
      branch: gitBranch,
      tagPrefix: gitTagPrefix,
    },
  }
}
