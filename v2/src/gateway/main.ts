import { createConnection } from 'node:net'
import { parseArgs } from 'node:util'
import * as grpc from '@grpc/grpc-js'
import {
  AverageService,
  calculate,
  type AverageServiceClient,
  type Input,
  type Output,
} from '../rpc/average-service.js'
import type { SensorReading } from '../sensors/protocol.js'
import { isSensorReading } from '../sensors/protocol.js'
import { GatewayDatabase, type Averages } from './database.js'

interface Address {
  host: string
  port: number
}

class Gateway {
  private readonly batches = new Map<string, SensorReading[]>()
  private readonly client: AverageServiceClient

  constructor(
    private readonly ports: string,
    private readonly service: Address,
    private readonly batchSize: number,
    private readonly database: GatewayDatabase,
  ) {
    this.client = new AverageService(
      `${service.host}:${service.port}`,
      grpc.credentials.createInsecure(),
    )
  }

  connectToPlot(address: Address): void {
    const label = `${address.host}:${address.port}`
    const socket = createConnection(address)
    socket.on('connect', () => console.log(`[gateway:${this.ports}] conectado ao talhão ${label}`))
    socket.on('data', (data: Buffer) => {
      let reading: unknown
      try {
        reading = JSON.parse(data.toString('utf8'))
      } catch {
        console.error(`[gateway:${this.ports}] leitura inválida do talhão ${label}`)
        return
      }

      if (!isSensorReading(reading)) {
        console.error(`[gateway:${this.ports}] leitura inválida do talhão ${label}`)
        return
      }

      this.addReading(label, reading)
    })
    socket.on('error', (error) =>
      console.error(`[gateway:${this.ports}] talhão ${label}: ${error.message}`),
    )
    socket.on('close', () => {
      console.log(`[gateway:${this.ports}] reconectando ao talhão ${label} em 2 s`)
      setTimeout(() => this.connectToPlot(address), 2_000)
    })
  }

  private addReading(label: string, reading: SensorReading): void {
    const batch = this.batches.get(label) || []
    batch.push(reading)
    this.batches.set(label, batch)
    if (batch.length < this.batchSize) return

    this.batches.set(label, [])
    void this.requestAverages(label, batch)
  }

  private async requestAverages(label: string, readings: SensorReading[]): Promise<void> {
    const first = readings[0]
    if (!first) return

    const request: Input = {
      groups: [
        readings.map((reading) => reading.temperature),
        readings.map((reading) => reading.humidity),
        readings.map((reading) => reading.rainfall),
      ],
    }

    let response: Output
    try {
      response = await calculate(this.client, request)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[gateway:${this.ports}] médias: ${message}`)
      return
    }

    const [temperature, humidity, rainfall] = response.averages
    if (
      typeof temperature !== 'number' ||
      typeof humidity !== 'number' ||
      typeof rainfall !== 'number'
    ) {
      console.error(`[gateway:${this.ports}] resposta inválida do serviço`)
      return
    }

    const averages: Averages = { temperature, humidity, rainfall }

    try {
      this.database.save(label, readings.length, averages, first.units)
      console.log(
        `[gateway:${this.ports}] talhão ${label}: ${readings.length} leituras, ` +
          `${averages.temperature} ${first.units.temperature}, ` +
          `${averages.humidity} ${first.units.humidity}, ` +
          `${averages.rainfall} ${first.units.rainfall}`,
      )
    } catch (error) {
      console.error(`[gateway:${this.ports}] erro ao salvar: ${error}`)
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
  const { values: args } = parseArgs({
    options: {
      service: { type: 'string' },
      lots: { type: 'string' },
      'batch-size': { type: 'string', default: '5' },
    },
  })
  const service = parseAddress(args.service || '')
  const lotsText = args.lots
  const batchSize = Number(args['batch-size'])
  const usage = 'Uso: gateway --service=<[host:]porta> --lots=<[host:]porta,...> [--batch-size=5]'
  if (!service || !lotsText || !Number.isInteger(batchSize) || batchSize < 1) {
    console.error(usage)
    process.exit(1)
  }

  const plots: Address[] = []
  for (const text of lotsText.split(',')) {
    const address = parseAddress(text)
    if (!address) {
      console.error(usage)
      process.exitCode = 1
      return
    }
    plots.push(address)
  }

  const ports = plots
    .map((address) => address.port)
    .sort((a, b) => a - b)
    .join('-')
  const database = new GatewayDatabase(`data/gateway-${ports}.sqlite`)
  console.log(`[gateway:${ports}] médias armazenadas em ${database.path}`)
  const gateway = new Gateway(ports, service, batchSize, database)
  for (const address of plots) gateway.connectToPlot(address)
}

main()
