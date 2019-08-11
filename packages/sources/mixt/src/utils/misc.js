import commandExists from 'command-exists'
import { spawnProcess } from './process'

export async function pikaPackAvailable() {
  let packFound = false
  let pikaPackFound = false

  console.log("Detecting pika command: pack or pika-pack")

  // Check if @pika/pack is installed globally
  try {
    await commandExists('pack')
    packFound = true
  } catch(err) {
    packFound = false
  }

  try {
    await commandExists('pika-pack')
    pikaPackFound = true
  } catch(err) {
    pikaPackFound = false
  }

  if(!pikaPackFound && !packFound) {
    return false
  }

  return packFound ? 'pack' : 'pika-pack'
}
