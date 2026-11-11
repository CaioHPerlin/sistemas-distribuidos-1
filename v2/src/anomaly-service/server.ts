import * as grpc from '@grpc/grpc-js'
import { log, logError } from '../common/logger.js'
import { AnomalyService, type Input, type Output } from './service.js'

export interface Limits {
  temperatureMax: number
  humidityMin: number
  rainfallMax: number
}

export function detect(input: Input, limits: Limits): Output {
  return {
    high_temperature: input.temperature > limits.temperatureMax,
    low_humidity: input.humidity < limits.humidityMin,
    heavy_rainfall: input.rainfall > limits.rainfallMax,
  }
}

export function startAnomalyServer(port: number, limits: Limits): void {
  const server = new grpc.Server()
  server.addService(AnomalyService.service, {
    Check: (call: grpc.ServerUnaryCall<Input, Output>, callback: grpc.sendUnaryData<Output>) => {
      const input = call.request
      if (![input.temperature, input.humidity, input.rainfall].every(Number.isFinite)) {
        callback({ code: grpc.status.INVALID_ARGUMENT, message: 'médias inválidas' })
        return
      }
      callback(null, detect(input, limits))
    },
  })
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) {
      logError('AnomalyService', 'Server', `0.0.0.0:${port}`, error)
      process.exitCode = 1
      return
    }
    log('AnomalyService', 'Server', `0.0.0.0:${port}`, 'Ouvindo')
  })
}
