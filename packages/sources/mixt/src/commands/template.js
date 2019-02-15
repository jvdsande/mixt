import Command from '../command'

/** Private functions **/

/** Command function **/
export async function command({
 rootDir, packagesDir, sourcesDir,
}) {
  // Code the command here
}

/** Command export */
export default function TemplateCommand(program) {
  Command(program, {
    name: 'template',
    command,
  })
}
