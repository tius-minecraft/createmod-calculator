import { decimal } from "../constants";
import { DEFAULT_MAX_RPM, millstoneTicks } from "../../create/kinetics";

export abstract class MillstoneCalculator {
  public static calculateFromRpm(rpm: number, recipeDuration: number): Result {
    if(rpm > 0) {
      const gt = millstoneTicks(rpm, recipeDuration);

      return {
        rpm: rpm,
        time: decimal(gt/20)!,
        speed: decimal(1/(gt/20))!
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

  public static calculateFromTime(time: number, recipeDuration: number): Result {
    let resultRpm = this.searchForRpm(0, DEFAULT_MAX_RPM, time, recipeDuration);
    let result = this.calculateFromRpm(resultRpm, recipeDuration);
    return result;
  }

  public static calculateFromSpeed(speed: number, recipeDuration: number): Result {
    let result = this.calculateFromTime(1/speed, recipeDuration);
    return result;
  }

  private static searchForRpm(rpm: number, maxRpm: number, targetTime: number, recipeDuration: number): number {
    let time = this.calculateFromRpm(rpm, recipeDuration).time;
    if(time <= targetTime || rpm >= maxRpm) {
      return rpm;
    }
    else {
      return this.searchForRpm(rpm+1, maxRpm, targetTime, recipeDuration);
    }
  }
}

export interface Result {
  rpm: number,
  time: number,
  speed: number
}