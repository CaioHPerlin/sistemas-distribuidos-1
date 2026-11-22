import { parseArgs } from 'node:util'
import { startAnomalyServer, type Limits } from './server.js'

function main(): void {
  const { values } = parseArgs({
    options: {
      port: { type: 'string', default: '4100' },
      'temperature-max': { type: 'string', default: '35' },
      'humidity-min': { type: 'string', default: '30' },
      'rainfall-max': { type: 'string', default: '40' },
    },
  })
  const port = Number(values.port)
  const limits: Limits = {
    temperatureMax: Number(values['temperature-max']),
    humidityMin: Number(values['humidity-min']),
    rainfallMax: Number(values['rainfall-max']),
  }
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Object.values(limits).every(Number.isFinite)
  ) {
    console.error(
      'Uso: anomaly-service [--port=4100] [--temperature-max=35] [--humidity-min=30] [--rainfall-max=40]',
    )
    process.exitCode = 1
    return
  }
  startAnomalyServer(port, limits)
}

main()
