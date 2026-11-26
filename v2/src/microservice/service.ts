import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

export interface Input {
  groups: number[][]
}

export interface Output {
  averages: number[]
}

interface WireRequest {
  groups: { values: number[] }[]
}

export interface AverageServiceClient extends grpc.Client {
  Calculate(
    request: WireRequest,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response?: Output) => void,
  ): grpc.ClientUnaryCall
}

export interface AverageServiceHandlers {
  Calculate: grpc.handleUnaryCall<WireRequest, Output>
}

interface AveragesPackage {
  averages: {
    AverageService: {
      service: grpc.ServiceDefinition
      new (address: string, credentials: grpc.ChannelCredentials): AverageServiceClient
    }
  }
}

const PROTO_PATH = new URL('../../proto/averages.proto', import.meta.url).pathname

const definition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  defaults: true,
  oneofs: true,
})
const loaded = grpc.loadPackageDefinition(definition) as unknown as AveragesPackage

export const AverageService = loaded.averages.AverageService

export function toWire(input: Input): WireRequest {
  return { groups: input.groups.map((values) => ({ values })) }
}

export function calculate(
  client: AverageServiceClient,
  input: Input,
  timeoutMs = 5_000,
): Promise<Output> {
  return new Promise((resolve, reject) => {
    client.Calculate(toWire(input), { deadline: Date.now() + timeoutMs }, (error, response) => {
      if (error || !response) return reject(error ?? new Error('resposta vazia'))
      resolve(response)
    })
  })
}
