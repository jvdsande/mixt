import cli from 'cli'

import Command from 'command'

/** Command function **/
async function command({
  packages,
}) {
  packages.forEach(pkg => {
    cli.info(`Found package '${pkg.name}'
 name: ${pkg.src.json.name}
 dist: ${pkg.dist.path}
 status: ${pkg.dist.exists ? 'built' : 'not built'}
    `)
  })
}

/** Command export */
export default function ListCommand(program) {
  Command(program, {
    name: 'list',
    command,
  })
}
