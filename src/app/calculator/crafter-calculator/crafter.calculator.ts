import { decimal } from "../constants";
import { DEFAULT_MAX_RPM, crafterTicks } from "../../create/kinetics";

export abstract class CrafterCalculator {
  public static calculateFromRpm(rpm: number, chainLength: number, inputDelay: number): Result {
    if(rpm > 0) {
      const frames = crafterTicks(rpm, chainLength, inputDelay);

      return {
        rpm: rpm,
        time: decimal(frames/20)!,
        speed: decimal(1/(frames/20))!
      };
    }
    else {
      return {
        rpm: rpm,
        time: Number.POSITIVE_INFINITY,
        speed: 0
      }
    }
  }

  public static calculateFromTime(time: number, chainLength: number, inputDelay: number): Result {
    let resultRpm = this.searchForRpm(0, DEFAULT_MAX_RPM, time, chainLength, inputDelay);
    let result = this.calculateFromRpm(resultRpm, chainLength, inputDelay);
    return result;
  }

  public static calculateFromSpeed(speed: number, chainLength: number, inputDelay: number): Result {
    let result = this.calculateFromTime(1/speed, chainLength, inputDelay);
    return result;
  }

  private static searchForRpm(rpm: number, maxRpm: number, targetTime: number, chainLength: number, inputDelay: number): number {
    let time = this.calculateFromRpm(rpm, chainLength, inputDelay).time;
    if(time <= targetTime || rpm >= maxRpm) {
      return rpm;
    }
    else {
      return this.searchForRpm(rpm+1, maxRpm, targetTime, chainLength, inputDelay);
    }
  }
}

export interface Result {
  rpm: number,
  time: number,
  speed: number
}