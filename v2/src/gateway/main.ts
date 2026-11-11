import { createConnection } from 'node:net'
import { parseArgs } from 'node:util'
import * as grpc from '@grpc/grpc-js'
import { log, logError } from '../common/logger.js'
import { AverageService, calculate, type AverageServiceClient } from '../rpc/average-service.js'
import { isSensorReading, type SensorReading } from '../sensors/protocol.js'
import { GatewayDatabase, type Averages } from './database.js'
import { startGatewayServer } from './server.js'

interface Address {
  host: string
  port: number
}

interface TimedReading {
  at: number
  value: SensorReading
}

class GatewayClient {
  private readonly readings = new Map<string, TimedReading[]>()
  private readonly service: AverageServiceClient

  constructor(
    private readonly database: GatewayDatabase,
    serviceAddress: Address,
    private readonly windowMs: number,
    publishMs: number,
  ) {
    this.service = new AverageService(
      `${serviceAddress.host}:${serviceAddress.port}`,
      grpc.credentials.createInsecure(),
    )
    setInterval(() => void this.publish(), publishMs)
  }

  connectToPlot(address: Address): void {
    const label = `${address.host}:${address.port}`
    const socket = createConnection(address)
    socket.on('connect', () => log('Gateway', 'Client', label, 'Conectado ao talhão'))
    socket.on('data', (data: Buffer) => {
      let value: unknown
      try {
        value = JSON.parse(data.toString('utf8'))
      } catch {
        logError('Gateway', 'Client', label, 'Leitura inválida')
        return
      }
      if (!isSensorReading(value)) {
        logError('Gateway', 'Client', label, 'Leitura inválida')
        return
      }
      const readings = this.readings.get(label) || []
      readings.push({ at: Date.now(), value })
      this.readings.set(label, readings)
    })
    socket.on('error', (error) => logError('Gateway', 'Client', label, error))
    socket.on('close', () => {
      log('Gateway', 'Client', label, 'Reconectando em 2 s')
      setTimeout(() => this.connectToPlot(address), 2_000)
    })
  }

  private async publish(): Promise<void> {
    const cutoff = Date.now() - this.windowMs
    for (const [label, entries] of this.readings) {
      const recent = entries.filter((entry) => entry.at >= cutoff)
      this.readings.set(label, recent)
      if (recent.length === 0) continue
      const readings = recent.map((entry) => entry.value)
      const first = readings[0]
      if (!first) continue
      try {
        const response = await calculate(this.service, {
          groups: [
            readings.map((reading) => reading.temperature),
            readings.map((reading) => reading.humidity),
            readings.map((reading) => reading.rainfall),
          ],
        })
        const [temperature, humidity, rainfall] = response.averages
        if (![temperature, humidity, rainfall].every(Number.isFinite)) {
          logError('Gateway', 'Client', label, 'Resposta inválida do serviço de médias')
          continue
        }
        const averages: Averages = {
          temperature: temperature as number,
          humidity: humidity as number,
          rainfall: rainfall as number,
        }
        this.database.save(label, readings.length, averages, first.units)
        log('Gateway', 'Client', label, `Médias de ${readings.length} leituras gravadas`)
      } catch (error) {
        logError('Gateway', 'Client', label, error)
      }
    }
  }
}

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
