import * as grpc from '@grpc/grpc-js'
import { parseArgs } from 'node:util'
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
    !Number.isInteger(port) || port < 1 || port > 65535 ||
    !Object.values(limits).every(Number.isFinite)
  ) {
    console.error('Uso: anomaly-service [--port=4100] [--temperature-max=35] [--humidity-min=30] [--rainfall-max=40]')
    process.exitCode = 1
    return
  }

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
      console.error(`[AnomalyService::Server][0.0.0.0:${port}] ${error.message}`)
      process.exitCode = 1
      return
    }
    console.log(`[AnomalyService::Server][0.0.0.0:${port}] Ouvindo`)
  })
}

main()
