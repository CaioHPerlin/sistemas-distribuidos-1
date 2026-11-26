import { parseArgs } from 'node:util'
import { startAverageServer } from './server.js'

function main(): void {
  const { values } = parseArgs({
    options: {
      port: { type: 'string', default: '4000' },
    },
  })
  const port = Number(values.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Uso: microservice [--port=<porta, padrão 4000>]')
    process.exitCode = 1
    return
  }
  startAverageServer(port)
}

main()
