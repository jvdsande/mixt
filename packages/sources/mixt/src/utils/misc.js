import commandExists from 'command-exists'

export async function pikaPackAvailable() {
  let packFound = false
  let pikaPackFound = false
  let pikaFound = false

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

  try {
    await commandExists('pika')
    pikaFound = true
  } catch(err) {
    pikaFound = false
  }

  if(!pikaPackFound && !packFound && !pikaFound) {
    return false
  }

  if(pikaFound) {
    return 'pika'
  }

  return packFound ? 'pack' : 'pika-pack'
}
