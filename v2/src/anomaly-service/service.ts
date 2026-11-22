import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

export interface Input {
  temperature: number
  humidity: number
  rainfall: number
}

export interface Output {
  high_temperature: boolean
  low_humidity: boolean
  heavy_rainfall: boolean
}

export interface AnomalyClient extends grpc.Client {
  Check(
    request: Input,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response?: Output) => void,
  ): grpc.ClientUnaryCall
}

interface AnomalyPackage {
  anomalies: {
    AnomalyService: {
      service: grpc.ServiceDefinition
      new (address: string, credentials: grpc.ChannelCredentials): AnomalyClient
    }
  }
}

const protoPath = new URL('../../proto/anomalies.proto', import.meta.url).pathname
const definition = protoLoader.loadSync(protoPath, { keepCase: true, defaults: true })
const loaded = grpc.loadPackageDefinition(definition) as unknown as AnomalyPackage

export const AnomalyService = loaded.anomalies.AnomalyService

export function check(client: AnomalyClient, input: Input): Promise<Output> {
  return new Promise((resolve, reject) => {
    client.Check(input, { deadline: Date.now() + 5_000 }, (error, response) => {
      if (error || !response) return reject(error || new Error('resposta vazia'))
      resolve(response)
    })
  })
}
