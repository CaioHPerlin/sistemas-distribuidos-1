import { parseArgs } from 'node:util'
import { FogClient, type Address } from './client.js'

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
      gateways: { type: 'string' },
      anomaly: { type: 'string', default: '4100' },
    },
  })
  const anomalyAddress = parseAddress(values.anomaly)
  const usage = 'Uso: fog --gateways=<host:porta,...> [--anomaly=host:porta]'
  if (!values.gateways || !anomalyAddress) {
    console.error(usage)
    process.exitCode = 1
    return
  }
  const gateways: Address[] = []
  for (const text of values.gateways.split(',')) {
    const address = parseAddress(text)
    if (!address) {
      console.error(usage)
      process.exitCode = 1
      return
    }
    gateways.push(address)
  }
  const fog = new FogClient(anomalyAddress)
  for (const gateway of gateways) fog.connectToGateway(gateway)
}

main()
