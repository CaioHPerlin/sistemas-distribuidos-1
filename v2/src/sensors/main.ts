import { parseArgs } from 'node:util'
import { startPlotServer } from './server.js'

function main(): void {
  const { values } = parseArgs({
    options: {
      port: { type: 'string' },
      'interval-ms': { type: 'string', default: '1000' },
    },
  })
  const port = Number(values.port)
  const intervalMs = Number(values['interval-ms'])
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Number.isInteger(intervalMs) ||
    intervalMs < 100
  ) {
    console.error('Uso: plots --port=<porta> [--interval-ms=<milissegundos, mínimo 100>]')
    process.exitCode = 1
    return
  }
  startPlotServer(port, intervalMs)
}

main()
