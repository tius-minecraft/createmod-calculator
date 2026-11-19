import { decimal, OPTIMIZED_GENERATOR } from "../constants";
import { blockBreakingTicks, DEFAULT_MAX_RPM, optimizedDrillTicks } from "../../create/kinetics";

export abstract class DrillCalculator {
  public static calculateFromRpm(hardness: number, delay: number, rpm: number): Result {
    if(rpm > 0) {
      const ticks = delay === OPTIMIZED_GENERATOR ? optimizedDrillTicks(rpm, hardness) : blockBreakingTicks(rpm, hardness, delay);
      const time = ticks / 20;
      return {
        rpm: rpm,
        time: decimal(time)!,
        speed: decimal(1 / time)!
      };
    }
    else {
      return {
        rpm: rpm,
        time: Number.POSITIVE_INFINITY,
        speed: 0
      };
    }
  }

  public static calculateFromTime(hardness: number, delay: number, time: number): Result {
    let resultRpm = this.searchForRpm(0, DEFAULT_MAX_RPM, time, hardness, delay);
    let result = this.calculateFromRpm(hardness, delay, resultRpm);
    return result;
  }

  public static calculateFromSpeed(hardness: number, delay: number, speed: number): Result {
    let result = this.calculateFromTime(hardness, delay, 1/speed);
    return result;
  }

  private static searchForRpm(rpm: number, maxRpm: number, targetTime: number, hardness: number, delay: number): number {
    let time = this.calculateFromRpm(hardness, delay, rpm).time;
    if(time <= targetTime || rpm >= maxRpm) {
      return rpm;
    }
    else {
      return this.searchForRpm(rpm+1, maxRpm, targetTime, hardness, delay);
    }
  }

}

export interface Result {
  rpm: number,
  time: number,
  speed: number
}