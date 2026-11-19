import { decimal } from '../constants';
import { DEFAULT_MAX_RPM, mixerTicks, TICKS_PER_SECOND } from '../../create/kinetics';

export abstract class MixerCalculator {
  static calculateFromRpm(rpm: number, duration = 0, continuous = true): Result {
    const time = mixerTicks(rpm, duration, continuous) / TICKS_PER_SECOND;
    return { rpm, time: decimal(time)!, speed: decimal(1 / time)! };
  }

  static calculateFromTime(time: number, duration = 0, continuous = true): Result {
    if (!Number.isFinite(time)) return this.calculateFromRpm(0, duration, continuous);
    let rpm = 1;
    while (rpm < DEFAULT_MAX_RPM && this.calculateFromRpm(rpm, duration, continuous).time > time) rpm++;
    return this.calculateFromRpm(rpm, duration, continuous);
  }

  static calculateFromSpeed(speed: number, duration = 0, continuous = true): Result {
    return this.calculateFromTime(1 / speed, duration, continuous);
  }
}

export interface Result {
  rpm: number;
  time: number;
  speed: number;
}
