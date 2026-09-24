import { createServer } from 'node:net'
import { readArgs } from '../common/args.js'
import type { AverageRequest, AverageResponse, Averages } from './protocol.js'
import { isAverageRequest } from './protocol.js'

function average(readings: AverageRequest['readings'], key: keyof Averages): number {
  const mean = readings.reduce((total, reading) => total + reading[key] / readings.length, 0)
  return Number(mean.toFixed(2))
}

function main(): void {
  const args = readArgs()
  const port = Number(args.port || '4000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Uso: microservice [--port=<porta, padrão 4000>]')
    process.exitCode = 1
    return
  }

  const server = createServer((socket) => {
    socket.on('data', (data: Buffer) => {
      let message: unknown
      try {
        message = JSON.parse(data.toString('utf8'))
      } catch {
        message = undefined
      }

      if (!isAverageRequest(message)) {
        socket.end()
        return
      }

      const response: AverageResponse = {
        averages: {
          temperature: average(message.readings, 'temperature'),
          humidity: average(message.readings, 'humidity'),
          rainfall: average(message.readings, 'rainfall'),
        },
      }
      socket.end(JSON.stringify(response))
    })
    socket.on('error', (error) => console.error(`[médias] ${error.message}`))
  })

  server.on('error', (error) => {
    console.error(`[médias] ${error.message}`)
    process.exitCode = 1
  })
  server.listen(port, () => console.log(`[médias] ouvindo na porta ${port}`))
}

main()
