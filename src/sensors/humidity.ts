import { MockOscillator } from "../common/MockOscillator.js";

class HumiditySensor extends MockOscillator {
  constructor(id: string, min = 20, max = 100, step = 1) {
    super(id, "humidity", "%", min, max, step);
  }
}

export { HumiditySensor };
