import fs from 'fs'
import path from 'path'

import { fileUtils } from '@mixt/utils'

export async function findAllPeerDependencies({ nodeModules }) {
  const packageJsons : string[] = await new Promise((resolve, reject) => {
    const walk = (dir, done) => {
      fs.readdir(dir, function(err, list) {
        let results = [];
        if (err) return reject(err);
        let pending = list.length;
        if (!pending) return done(results);
        list.forEach(function (file) {
          file = path.resolve(dir, file);
          fs.stat(file, function (err, stat) {
            if (stat && stat.isDirectory()) {
              walk(file, function (res) {
                results = results.concat(res);
                if (!--pending) done(results);
              });
            } else {
              if(file && file.endsWith('package.json')) {
                results.push(file);
              }
              if (!--pending) done(results);
            }
          })
        })
      })
    }
    walk(nodeModules, resolve)
  })

  const peerDependencies = []
  await Promise.all(packageJsons.map(async (jsonPath) => {
    const json = await fileUtils.getJson(jsonPath)
    if(json && json.peerDependencies) {
      Object.keys(json.peerDependencies).forEach(dep => {
        if(!peerDependencies.includes(dep)) {
          peerDependencies.push(dep)
        }
      })
    }
  }))

  return peerDependencies
}
