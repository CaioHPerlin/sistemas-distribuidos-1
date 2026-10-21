import { createServer, type Socket } from 'node:net'
import { parseArgs } from 'node:util'

function main(): void {
  const { values } = parseArgs({
    options: {
      port: { type: 'string' },
      'interval-s': { type: 'string', default: '10' },
    },
  })

  const port = Number(values.port)
  const intervalSeconds = Number(values['interval-s'])

  //   if (!Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(intervalSeconds)) {
  //     console.error('Uso: gateway --port=<porta> [--interval-s=<intervalo de envio para a FOG>]')
  //     process.exit(1)
  //   }

  //   let client: Socket | undefined

  //   const server = createServer((socket) => {
  //     if (client) {
  //       socket.end()
  //       return
  //     }

  //     client = socket
  //     socket.on('close', () => {
  //       client = undefined
  //     })
  //     socket.on('error', (error) => console.error(`[gateway:${port}] ${error.message}`))
  //   })

  //   server.on('error', (error) => {
  //     console.error(`[GatewayServer:${port}] ${error.message}`)
  //     process.exitCode = 1
  //   })

  //   server.listen(port, () => {
  //     console.log(`[GatewayServer:${port}] ouvindo na porta ${port}`)
  //     setInterval(() => {
  //       if (!client) return

  //       const reading: SensorReading = {
  //         timestamp: new Date().toISOString(),
  //         temperature: temperature.read(),
  //         humidity: humidity.read(),
  //         rainfall: rainfall.read(),
  //         units: {
  //           temperature: temperature.unit,
  //           humidity: humidity.unit,
  //           rainfall: rainfall.unit,
  //         },
  //       }
  //       client.write(JSON.stringify(reading))
  //     }, intervalMs)
  //   })
}

main()
