/** Mensagem enviada pelo servidor de sensores ao gateway. */
export interface SensorUnits {
  temperature: string;
  humidity: string;
  rainfall: string;
}

export interface SensorReading {
  timestamp: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  units: SensorUnits;
}

export function isSensorReading(value: unknown): value is SensorReading {
  if (!value || typeof value !== "object") return false;
  const reading = value as Partial<SensorReading>;
  if (!reading.units || typeof reading.units !== "object") return false;
  return (
    typeof reading.timestamp === "string" &&
    typeof reading.temperature === "number" &&
    typeof reading.humidity === "number" &&
    typeof reading.rainfall === "number" &&
    typeof reading.units.temperature === "string" &&
    typeof reading.units.humidity === "string" &&
    typeof reading.units.rainfall === "string"
  );
}
