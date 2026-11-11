import { createConnection } from 'node:net'
import * as grpc from '@grpc/grpc-js'
import {
  AnomalyService,
  check,
  type AnomalyClient,
  type Output,
} from '../anomaly-service/service.js'
import { log, logError } from '../common/logger.js'
import type { AverageRecord } from '../gateway/database.js'

export interface Address {
  host: string
  port: number
}

function isRecord(value: unknown): value is AverageRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<AverageRecord>
  return (
    typeof record.plot_address === 'string' &&
    Number.isFinite(record.id) &&
    Number.isFinite(record.temperature) &&
    Number.isFinite(record.humidity) &&
    Number.isFinite(record.rainfall)
  )
}

function describe(result: Output): string[] {
  const anomalies: string[] = []
  if (result.high_temperature) anomalies.push('temperatura alta')
  if (result.low_humidity) anomalies.push('umidade baixa')
  if (result.heavy_rainfall) anomalies.push('chuva forte')
  return anomalies
}

export class FogClient {
  private readonly anomaly: AnomalyClient

  constructor(anomalyAddress: Address) {
    this.anomaly = new AnomalyService(
      `${anomalyAddress.host}:${anomalyAddress.port}`,
      grpc.credentials.createInsecure(),
    )
  }

  connectToGateway(address: Address): void {
    const label = `${address.host}:${address.port}`
    const socket = createConnection(address)
    let pending = ''
    socket.setEncoding('utf8')
    socket.on('connect', () => log('Fog', 'Client', label, 'Conectado ao gateway'))
    socket.on('data', (chunk: string) => {
      pending += chunk
      let newline = pending.indexOf('\n')
      while (newline >= 0) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        this.handleRecord(label, line)
        newline = pending.indexOf('\n')
      }
    })
    socket.on('error', (error) => logError('Fog', 'Client', label, error))
    socket.on('close', () => {
      log('Fog', 'Client', label, 'Reconectando em 2 s')
      setTimeout(() => this.connectToGateway(address), 2_000)
    })
  }

  private handleRecord(gateway: string, line: string): void {
    let value: unknown
    try {
      value = JSON.parse(line)
    } catch {
      logError('Fog', 'Client', gateway, 'Registro inválido')
      return
    }
    if (!isRecord(value)) {
      logError('Fog', 'Client', gateway, 'Registro inválido')
      return
    }
    void this.analyze(gateway, value)
  }

  private async analyze(gateway: string, record: AverageRecord): Promise<void> {
    try {
      const result = await check(this.anomaly, {
        temperature: record.temperature,
        humidity: record.humidity,
        rainfall: record.rainfall,
      })
      const anomalies = describe(result)
      if (anomalies.length === 0) return
      log('Fog', 'Client', gateway, `Talhão ${record.plot_address}: ${anomalies.join(', ')}`)
    } catch (error) {
      logError('Fog', 'Client', gateway, `Talhão ${record.plot_address}: ${error}`)
    }
  }
}
