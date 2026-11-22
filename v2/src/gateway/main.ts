import { parseArgs } from 'node:util'
import { GatewayClient, type Address } from './client.js'
import { GatewayDatabase } from './database.js'
import { startGatewayServer } from './server.js'

function parseAddress(text: string): Address | undefined {
  const parts = text.split(':')
  const host = parts.length === 1 ? '127.0.0.1' : parts[0]
  const port = Number(parts.length === 1 ? parts[0] : parts[1])
  if (parts.length > 2 || !host || !Number.isInteger(port) || port < 1 || port > 65535) return
  return { host, port }
}

function main(): void {
  const { values } = parseArgs({
    options: {
      service: { type: 'string' },
      lots: { type: 'string' },
      port: { type: 'string', default: '8080' },
      'window-ms': { type: 'string', default: '5000' },
      'publish-ms': { type: 'string', default: '5000' },
      'client-only': { type: 'boolean', default: false },
      'server-only': { type: 'boolean', default: false },
    },
  })
  const clientOnly = values['client-only']
  const serverOnly = values['server-only']
  const service = parseAddress(values.service || '')
  const port = Number(values.port)
  const windowMs = Number(values['window-ms'])
  const publishMs = Number(values['publish-ms'])
  const usage =
    'Uso: gateway --lots=<host:porta,...> [--service=host:porta] [--port=8080] [--window-ms=5000] [--publish-ms=5000] [--client-only|--server-only]'
  if (
    !values.lots ||
    (clientOnly && serverOnly) ||
    (!serverOnly && !service) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Number.isInteger(windowMs) ||
    windowMs < 100 ||
    !Number.isInteger(publishMs) ||
    publishMs < 100
  ) {
    console.error(usage)
    process.exitCode = 1
    return
  }

  const plots: Address[] = []
  for (const text of values.lots.split(',')) {
    const address = parseAddress(text)
    if (!address) {
      console.error(usage)
      process.exitCode = 1
      return
    }
    plots.push(address)
  }
  const ports = plots
    .map((plot) => plot.port)
    .sort((a, b) => a - b)
    .join('-')
  const database = new GatewayDatabase(`data/gateway-${ports}.sqlite`)
  if (!clientOnly) startGatewayServer(port, database, publishMs)
  if (serverOnly || !service) return

  const client = new GatewayClient(database, service, windowMs, publishMs)
  for (const plot of plots) client.connectToPlot(plot)
}

main()
