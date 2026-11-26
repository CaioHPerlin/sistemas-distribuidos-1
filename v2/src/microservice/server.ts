import * as grpc from '@grpc/grpc-js'
import { log, logError } from '../common/logger.js'
import { AverageService, type AverageServiceHandlers } from './service.js'

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

export function startAverageServer(port: number): void {
  const server = new grpc.Server()
  server.addService(
    AverageService.service,
    handlers as unknown as grpc.UntypedServiceImplementation,
  )
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) {
      logError('AverageService', 'Server', `0.0.0.0:${port}`, error)
      process.exitCode = 1
      return
    }
    log('AverageService', 'Server', `0.0.0.0:${port}`, 'Ouvindo')
  })
}
