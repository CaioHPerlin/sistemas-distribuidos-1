import { createServer, type Socket } from 'node:net'
import { log, logError } from '../common/logger.js'
import { HumiditySensor, RainGaugeSensor, TemperatureSensor } from './sensors.js'
import type { SensorReading } from './protocol.js'

export function startPlotServer(port: number, intervalMs: number): void {
  const temperature = new TemperatureSensor()
  const humidity = new HumiditySensor()
  const rainfall = new RainGaugeSensor()
  let client: Socket | undefined

  const server = createServer((socket) => {
    if (client) {
      socket.end()
      return
    }

    client = socket
    socket.on('close', () => {
      client = undefined
    })
    socket.on('error', (error) => logError('Plot', 'Server', `0.0.0.0:${port}`, error))
  })

  server.on('error', (error) => {
    logError('Plot', 'Server', `0.0.0.0:${port}`, error)
    process.exitCode = 1
  })

  server.listen(port, () => {
    log('Plot', 'Server', `0.0.0.0:${port}`, 'Ouvindo')
    setInterval(() => {
      if (!client) return

      const reading: SensorReading = {
        timestamp: new Date().toISOString(),
        temperature: temperature.read(),
        humidity: humidity.read(),
        rainfall: rainfall.read(),
        units: {
          temperature: temperature.unit,
          humidity: humidity.unit,
          rainfall: rainfall.unit,
        },
      }
      client.write(JSON.stringify(reading))
    }, intervalMs)
  })
}
