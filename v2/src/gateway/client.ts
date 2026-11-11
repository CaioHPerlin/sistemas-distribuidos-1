import { createConnection } from 'node:net'
import * as grpc from '@grpc/grpc-js'
import { log, logError } from '../common/logger.js'
import { AverageService, calculate, type AverageServiceClient } from '../rpc/average-service.js'
import { isSensorReading, type SensorReading } from '../sensors/protocol.js'
import { GatewayDatabase, type Averages } from './database.js'

export interface Address {
  host: string
  port: number
}

interface TimedReading {
  at: number
  value: SensorReading
}

export class GatewayClient {
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
