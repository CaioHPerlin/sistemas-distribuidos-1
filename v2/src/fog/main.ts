import { createConnection } from 'node:net'
import { parseArgs } from 'node:util'
import * as grpc from '@grpc/grpc-js'
import {
  AnomalyService,
  check,
  type AnomalyClient,
  type Output,
} from '../anomaly-service/service.js'
import { log, logError } from '../common/logger.js'
import type { AverageRecord } from '../gateway/database.js'

interface Address {
  host: string
  port: number
}

function parseAddress(text: string): Address | undefined {
  const parts = text.split(':')
  const host = parts.length === 1 ? '127.0.0.1' : parts[0]
  const port = Number(parts.length === 1 ? parts[0] : parts[1])
  if (parts.length > 2 || !host || !Number.isInteger(port) || port < 1 || port > 65535) return
  return { host, port }
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

class Fog {
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
  const fog = new Fog(anomalyAddress)
  for (const gateway of gateways) fog.connectToGateway(gateway)
}

main()
