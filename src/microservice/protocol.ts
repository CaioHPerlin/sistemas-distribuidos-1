import type { SensorReading } from "../sensors/protocol.js";
import { isSensorReading } from "../sensors/protocol.js";

/** Pedido e resposta do serviço de médias. */
export interface Averages {
  temperature: number;
  humidity: number;
  rainfall: number;
}

export interface AverageRequest {
  readings: SensorReading[];
}

export interface AverageResponse {
  averages: Averages;
}

export function isAverageRequest(value: unknown): value is AverageRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<AverageRequest>;
  return (
    Array.isArray(request.readings) &&
    request.readings.length > 0 &&
    request.readings.every(isSensorReading)
  );
}
