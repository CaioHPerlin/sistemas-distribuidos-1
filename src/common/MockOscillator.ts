interface SensorReading {
  sensorId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: number;
}

abstract class MockOscillator {
  private _id: string;
  private _type: string;
  private _min: number;
  private _max: number;
  private _step: number;

  protected value: number;

  protected constructor(
    id: string,
    type: string,
    min: number,
    max: number,
    step: number,
  ) {
    this._id = id;
    this._type = type;
    this._min = min;
    this._max = max;
    this._step = step;
    this.value = min + Math.random() * (max - min);
  }

  private oscillate(): number {
    const delta = (Math.random() * 2 - 1) * this._step;
    this.value = Math.min(this._max, Math.max(this._min, this.value + delta));
    return this.value;
  }

  getId(): string {
    return this._id;
  }

  getType(): string {
    return this._type;
  }

  abstract getUnit(): string;

  read(): SensorReading {
    return {
      sensorId: this.getId(),
      type: this.getType(),
      value: Number(this.oscillate().toFixed(2)),
      unit: this.getUnit(),
      timestamp: Date.now(),
    };
  }
}

export { MockOscillator };
export type { SensorReading };
