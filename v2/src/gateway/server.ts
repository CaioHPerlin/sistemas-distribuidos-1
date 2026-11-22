import { createServer } from 'node:net'
import { log, logError } from '../common/logger.js'
import { GatewayDatabase } from './database.js'

export function startGatewayServer(
  port: number,
  database: GatewayDatabase,
  publishMs: number,
): void {
  const address = `0.0.0.0:${port}`
  const server = createServer((socket) => {
    log('Gateway', 'Server', address, `FOG conectada: ${socket.remoteAddress}:${socket.remotePort}`)
    let lastSent = database.latestId()
    const timer = setInterval(() => {
      try {
        for (const record of database.since(lastSent)) {
          socket.write(`${JSON.stringify(record)}\n`)
          lastSent = record.id
        }
      } catch (error) {
        logError('Gateway', 'Server', address, error)
      }
    }, publishMs)
    socket.on('close', () => {
      clearInterval(timer)
      log('Gateway', 'Server', address, 'FOG desconectada')
    })
    socket.on('error', (error) => logError('Gateway', 'Server', address, error))
  })
  server.on('error', (error) => {
    logError('Gateway', 'Server', address, error)
    process.exitCode = 1
  })
  server.listen(port, '0.0.0.0', () => log('Gateway', 'Server', address, 'Ouvindo'))
}
