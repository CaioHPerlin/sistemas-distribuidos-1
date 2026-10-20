import { createServer } from 'node:net'
import { readArgs } from '../common/args.js'

/** Cada grupo de números produz uma média na mesma posição da resposta. */
export interface Input {
  groups: number[][]
}

export interface Output {
  averages: number[]
}

function isInput(value: unknown): value is Input {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<Input>
  return Array.isArray(input.groups) &&
    input.groups.length > 0 &&
    input.groups.every((group) => Array.isArray(group) && group.length > 0 && group.every(Number.isFinite))
}

function average(values: number[]): number {
  const mean = values.reduce((total, value) => total + value, 0) / values.length
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

      if (!isInput(message)) {
        socket.end()
        return
      }

      const response: Output = { averages: message.groups.map(average) }
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
