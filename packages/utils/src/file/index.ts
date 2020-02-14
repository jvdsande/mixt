import fs from "fs"
import { promisify } from 'util'

import cli from 'cli'
import { ncp } from 'ncp'
import mkdirp from 'mkdirp'
import rmf from 'rimraf'

export const readDir = promisify(fs.readdir)
export const readFile = promisify(fs.readFile)
export const writeFile = promisify(fs.writeFile)
export const mkdir = promisify(mkdirp)
export const cp = promisify(ncp)
export const rm = promisify(rmf)

const open = promisify(fs.open)
const close = promisify(fs.close)

export async function touch(file) {
  return await open(file, 'w').then(close)
}

/**
 * Util function opening a JSON file and parsing it.
 * Return an empty object if the file does not exist
 * @param file - JSON to open
 */
export async function getJson(file) {
  return JSON.parse((await readFile(file, 'utf-8')) || '{}')
}

/**
 * Util function writing the content of a JSON file
 * @param file - JSON file to write
 * @param json - Value to write
 */
export async function saveJson(file, json) {
  try {
    await writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf-8')
  } catch(err) {
    cli.error('Error while writing file "' + file + '": ', err)
  }

  return true;
}
