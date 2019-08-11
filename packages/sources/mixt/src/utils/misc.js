import { spawnProcess } from './process'

export async function pikaPackAvailable() {
  let packFound = false
  let pikaPackFound = false

  // Check if @pika/pack is installed globally
  try {
    await spawnProcess('pack', true)
    packFound = true
  } catch(err) {
    packFound = false
  }

  try {
    await spawnProcess('pika-pack', true)
    pikaPackFound = true
  } catch(err) {
    pikaPackFound = false
  }

  if(!pikaPackFound && !packFound) {
    return false
  }

  return packFound ? 'pack' : 'pika-pack'
}
