/** Lê argumentos no formato --nome=valor. */
export function readArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  for (const argument of process.argv.slice(2)) {
    const separator = argument.indexOf('=')
    if (!argument.startsWith('--') || separator < 3) continue
    args[argument.slice(2, separator)] = argument.slice(separator + 1)
  }
  return args
}
