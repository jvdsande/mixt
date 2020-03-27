import path from 'path'
import fs from 'fs'

import cli from 'cli'

import { getJson, readDir } from 'file'

async function getMixtJson(source) {
  try {
    return await getJson(path.resolve(source, 'mixt.json'))
  } catch(err) {
    return {}
  }
}

async function getPackageJson(source) {
  try {
    return await getJson(path.resolve(source, 'package.json'))
  } catch(err) {
    return {}
  }
}

async function extractPackages(sources, root, buildOrder) {
  // Go through each source
  return (await Promise.all(sources.map(async source => {
    // For each sources dir, get a list of packages
    const packagesNames = await readDir(source)

    // Go through each packages
    const packages = await Promise.all(packagesNames.map(async name => {
      // Get the package path
      const srcPath = path.resolve(source, name)

      // Retrieve the package's package.json
      const srcJson = await getPackageJson(srcPath)

      const src = {
        exists: !!srcJson.name,
        json: srcJson,
        path: srcPath,
        relativePath: path.relative(root, srcPath),
      }

      // Get mixt options
      const options = srcJson.mixt || {}

      // Get the dist path
      const distPath = path.resolve(srcPath, options.dist || '')

      // Retrieve the dist's package.json
      const distJson = await getPackageJson(distPath)

      const dist = {
        exists: !!distJson.name,
        json: distJson,
        path: distPath,
        relativePath: path.relative(root, distPath)
      }

      return {
        name,
        options,
        src,
        dist,
        async reload() {
          // Retrieve the package's package.json
          const srcJsonReloaded = await getPackageJson(srcPath)
          // Retrieve the dist's package.json
          const distJsonReloaded = await getPackageJson(distPath)

          src.exists = !!srcJsonReloaded.name
          src.json = srcJsonReloaded

          dist.exists = !!distJsonReloaded.name
          dist.json = distJsonReloaded
        }
      }
    }))

    return packages.sort((a, b) => {
      const aSrcNameOrderIndex =  a.src.exists ? buildOrder.indexOf(a.src.json.name) : -1
      const aDistNameOrderIndex = a.dist.exists ? buildOrder.indexOf(a.dist.json.name) : -1
      const aNameOrderIndex = buildOrder.indexOf(a.name)

      const bSrcNameOrderIndex =  b.src.exists ? buildOrder.indexOf(b.src.json.name) : -1
      const bDistNameOrderIndex = b.dist.exists ? buildOrder.indexOf(b.dist.json.name) : -1
      const bNameOrderIndex = buildOrder.indexOf(b.name)

      const aIndex = Math.min(...[aSrcNameOrderIndex, aDistNameOrderIndex, aNameOrderIndex].filter(n => n > -1), Number.MAX_SAFE_INTEGER)
      const bIndex = Math.min(...[bSrcNameOrderIndex, bDistNameOrderIndex, bNameOrderIndex].filter(n => n > -1), Number.MAX_SAFE_INTEGER)

      return aIndex - bIndex
    })
  })))
    .flat(2)
}


export async function getConfig(cmd, init) {
  // Always work from root directory
  const rootDir   = process.cwd()

  // Extract configuration from 'mixt.json' or from 'mixt' field in 'package.json'
  const config = init ? {} : await getMixtJson(rootDir)
  const packageJson = init ? {} : await getPackageJson(rootDir)
  const json = packageJson.mixt || {}

  // Prepare source filtering functions
  const filterUndefinedSources = (sources) => !!sources
  const ignored = []
  const filterIncompatibleSources = (source) => {
    if(ignored.includes(source)) {
      return false
    }
    if(source.endsWith('node_modules')) {
      cli.info(`'node_modules' cannot be used as a source, ignoring '${source}'`)
      ignored.push(source)
      return false
    }
    if(!fs.existsSync(source)) {
      cli.info(`Source '${source}' does not exist, ignoring`)
      ignored.push(source)
      return false
    }
    return true
  }
  const filterDuplicatedSources = (source, index, sources) => sources.indexOf(source) === index
  const getFullPathForSources = (source) => path.resolve(rootDir, source)
  const mergeSources = (sources) => sources

  // Get the list of current sources (command line arguments has highest priority)
  const sources : string[] = [(cmd.sources && cmd.sources.split(',')), config.sources, json.sources, ['packages']]
    // Remove undefined sources
    .filter(filterUndefinedSources)
    // Get the first defined sources
    .shift()
    // Filter out incompatible sources
    .filter(filterIncompatibleSources)
    // Filter out duplicated sources
    .filter(filterDuplicatedSources)
    // Get full path
    .map(getFullPathForSources)

  // Get the list of all sources (defined in configuration or through command line)
  const allSources : string[] = [config.sources, json.sources, (cmd.sources && cmd.sources.split(',')), ['packages']]
    // Remove undefined sources
    .filter(filterUndefinedSources)
    // Merge all sources together
    .flatMap(mergeSources)
    // Filter out incompatible sources
    .filter(filterIncompatibleSources)
    // Filter out duplicated sources
    .filter(filterDuplicatedSources)
    // Get full path
    .map(getFullPathForSources)

  const buildOrder = config.buildOrder || json.buildOrder || []

  const packages = (await extractPackages(sources.map(s => path.resolve(rootDir, s)), rootDir, buildOrder))
    .filter(p => !cmd.packages
      || !cmd.packages.length
      || cmd.packages.includes(p.name)
      || cmd.packages.includes(p.src.json.name)
      || cmd.packages.includes(p.dist.json.name)
    )
    .filter(p => !cmd.package
      || cmd.package === p.name
      || cmd.package === p.src.json.name
      || cmd.package === p.dist.json.name
    )
  const allPackages = await extractPackages(allSources.map(s => path.resolve(rootDir, s)), rootDir, buildOrder)

  // Get git configuration
  const gitBranch     = cmd.gitBranch || (config.git && config.git.branch) || (json.git && json.git.branch) || 'master'
  const gitTagPrefix  = cmd.gitTagPrefix || (config.git && config.git.tagPrefix) || (json.git && json.git.tagPrefix) || ''

  // Get global flags
  const prefix  = (cmd.prefix) || (config.prefix) || (json.prefix) || 'mixt:'
  const resolve = (cmd.resolve) || (config.resolve) || (json.resolve) || 'full'
  const hoist = (cmd.hoist )

  if(!init && !packages.length) {
    cli.info('No handled package found, exiting early')
    cli.info('Check your options or add your first package')
    process.exit(0)
  }

  return {
    root: rootDir,
    defaultSource: allSources[0],
    packages,
    allPackages,
    git: {
      branch: gitBranch,
      tagPrefix: gitTagPrefix,
    },
    global: {
      prefix,
      resolve,
      hoist,
    }
  }
}
