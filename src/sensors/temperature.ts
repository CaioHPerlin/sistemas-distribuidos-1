import { MockOscillator } from "../common/MockOscillator.js";

class TemperatureSensor extends MockOscillator {
  constructor(id: string, min = 10, max = 40, step = 0.5) {
    super(id, "temperature", "°C", min, max, step);
  }
}

export { TemperatureSensor };
