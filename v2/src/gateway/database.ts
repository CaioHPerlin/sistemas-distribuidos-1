import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { SensorUnits } from '../sensors/protocol.js'

export interface Averages {
  temperature: number
  humidity: number
  rainfall: number
}

export interface AverageRecord extends Averages {
  id: number
  plot_address: string
  calculated_at: string
  sample_count: number
  temperature_unit: string
  humidity_unit: string
  rainfall_unit: string
}

export class GatewayDatabase {
  private readonly db: DatabaseSync

  constructor(readonly path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS averages (
        id INTEGER PRIMARY KEY,
        plot_address TEXT NOT NULL,
        calculated_at TEXT NOT NULL,
        sample_count INTEGER NOT NULL,
        temperature REAL NOT NULL,
        temperature_unit TEXT NOT NULL,
        humidity REAL NOT NULL,
        humidity_unit TEXT NOT NULL,
        rainfall REAL NOT NULL,
        rainfall_unit TEXT NOT NULL
      )
    `)
  }

  save(address: string, sampleCount: number, averages: Averages, units: SensorUnits): void {
    this.db
      .prepare(
        `
      INSERT INTO averages
        (plot_address, calculated_at, sample_count,
         temperature, temperature_unit, humidity, humidity_unit, rainfall, rainfall_unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        address,
        new Date().toISOString(),
        sampleCount,
        averages.temperature,
        units.temperature,
        averages.humidity,
        units.humidity,
        averages.rainfall,
        units.rainfall,
      )
  }

  latestId(): number {
    const row = this.db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM averages').get() as {
      id: number
    }
    return row.id
  }

  since(id: number): AverageRecord[] {
    return this.db
      .prepare('SELECT * FROM averages WHERE id > ? ORDER BY id')
      .all(id) as unknown as AverageRecord[]
  }
}
