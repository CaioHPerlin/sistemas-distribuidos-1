/** Valor simulado que oscila dentro de uma faixa. */
export abstract class Sensor {
  abstract readonly unit: string
  private value: number

  protected constructor(
    private readonly min: number,
    private readonly max: number,
    private readonly step: number,
  ) {
    this.value = min + Math.random() * (max - min)
  }

  read(): number {
    this.value = Math.min(
      this.max,
      Math.max(this.min, this.value + (Math.random() * 2 - 1) * this.step),
    )
    return Number(this.value.toFixed(2))
  }
}

export class TemperatureSensor extends Sensor {
  readonly unit = '°C'

  constructor() {
    super(10, 40, 0.5)
  }
}

export class HumiditySensor extends Sensor {
  readonly unit = '%'

  constructor() {
    super(20, 100, 1)
  }
}

export class RainGaugeSensor extends Sensor {
  readonly unit = 'mm/h'

  constructor() {
    super(0, 50, 3)
  }
}
