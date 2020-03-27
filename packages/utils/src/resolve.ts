import depcheck from 'depcheck'

export async function fullResolve({ path }) : Promise<string[]> {
  return new Promise((resolve) => {
    const options = {
      ignoreBinPackage: false, // ignore the packages with bin entry
      skipMissing: false, // skip calculation of missing dependencies
    }

    depcheck(path, options, (deps) => {
      resolve(Object.keys(deps.using))
    })
  })
}

export async function cheapResolve({ json }) {
  return Object.keys({
    ...(json.peerDependencies || {}),
    ...(json.dependencies || {}),
  })
}
