export function log(
  module: string,
  role: 'Client' | 'Server',
  address: string,
  message: string,
): void {
  console.log(`[${module}::${role}][${address}] ${message}`)
}

export function logError(
  module: string,
  role: 'Client' | 'Server',
  address: string,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${module}::${role}][${address}] ${message}`)
}
