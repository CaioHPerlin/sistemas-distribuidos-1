import * as grpc from '@grpc/grpc-js'
import { parseArgs } from 'node:util'
import { AverageService, type AverageServiceHandlers } from '../rpc/average-service.js'

export type { Input, Output } from '../rpc/average-service.js'

function average(values: number[]): number {
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  return Number(mean.toFixed(2))
}

const handlers: AverageServiceHandlers = {
  Calculate(call, callback) {
    const groups = call.request.groups.map((group) => group.values)
    const valid =
      groups.length > 0 &&
      groups.every((values) => values.length > 0 && values.every(Number.isFinite))

    if (!valid) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'groups deve conter ao menos um grupo e cada grupo, números finitos',
      })
      return
    }

    callback(null, { averages: groups.map(average) })
  },
}

function main(): void {
  const { values: args } = parseArgs({
    options: {
      port: { type: 'string', default: '4000' },
    },
  })
  const port = Number(args.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Uso: microservice [--port=<porta, padrão 4000>]')
    process.exit(1)
  }

  const server = new grpc.Server()
  server.addService(
    AverageService.service,
    handlers as unknown as grpc.UntypedServiceImplementation,
  )
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) {
      console.error(`[médias] ${error.message}`)
      process.exitCode = 1
      return
    }
    console.log(`[médias] ouvindo na porta ${port}`)
  })
}

main()
