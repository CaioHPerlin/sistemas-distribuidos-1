import { MockOscillator } from "../common/MockOscillator.js";

class RainGaugeSensor extends MockOscillator {
  constructor(id: string, min = 0, max = 50, step = 3) {
    super(id, "rain", "mm/h", min, max, step);
  }
}

export { RainGaugeSensor };
