import { createServer, type Socket } from 'node:net'
import { readArgs } from '../common/args.js'
import { HumiditySensor, RainGaugeSensor, TemperatureSensor } from './sensors.js'
import type { SensorReading } from './protocol.js'

function main(): void {
  const args = readArgs()
  const port = Number(args.port)
  const intervalMs = Number(args['interval-ms'] || '1000')
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(intervalMs) || intervalMs < 100) {
    console.error('Uso: sensors --port=<porta> [--interval-ms=<milissegundos, mínimo 100>]')
    process.exitCode = 1
    return
  }

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
    socket.on('close', () => { client = undefined })
    socket.on('error', (error) => console.error(`[talhão:${port}] ${error.message}`))
  })
  server.on('error', (error) => {
    console.error(`[talhão:${port}] ${error.message}`)
    process.exitCode = 1
  })
  server.listen(port, () => {
    console.log(`[talhão:${port}] ouvindo na porta ${port}`)
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

main()
