import { spawnProcess } from './process'

export async function pikaPackAvailable() {
  try {
    await spawnProcess('pack', true)
    return true
  } catch(err) {
    return false
  }
}
