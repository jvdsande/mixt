import fs from "fs"

function promisify(func) {
  return (...args) => new Promise((resolve, reject) => func(...args, (err, res) => err ? reject(err) : resolve(res)))
}

export const readDir = promisify(fs.readdir)
export const readFile = promisify(fs.readFile)
export const writeFile = promisify(fs.writeFile)


export async function getJson(file) {
  return JSON.parse((await readFile(file, 'utf-8')) || '{}')
}

export async function saveJson(file, json) {
  return await writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8')
}
