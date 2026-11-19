// Create mc1.21.1-6.0.10. Source classes and configuration are listed in README.md.
export const CREATE_VERSION = '6.0.10';
export const MINECRAFT_VERSION = '1.21.1';
export const CREATE_SOURCE = 'https://github.com/Creators-of-Create/Create/tree/mc1.21.1-6.0.10';
export const DEFAULT_MAX_RPM = 256;
export const TICKS_PER_SECOND = 20;
export const OPERATIONS_PER_MINUTE = TICKS_PER_SECOND * 60;
export const MIXER_MIN_RPM = 30;
export const SPOUT_TICKS = 21;

const clamp = (number: number, min: number, max: number) => Math.max(min, Math.min(max, number));

export function pressTicks(rpm: number): number {
  if (rpm <= 0) return Infinity;
  const step = Math.trunc(1 + 59 * clamp(rpm / 512, 0, 1));
  return Math.ceil(120 / step) + Math.ceil(121 / step) + 2;
}

export function mixerTicks(rpm: number, duration = 0, continuous = true): number {
  if (rpm < MIXER_MIN_RPM) return Infinity;
  const exponent = Math.floor(Math.log2(Math.max(1, Math.trunc(512 / rpm))));
  const work = exponent * Math.ceil((duration || 100) * 15 / 100) + 1;
  return work + (continuous ? 1 : 40);
}

export function millstoneTicks(rpm: number, duration: number): number {
  if (rpm <= 0) return Infinity;
  return Math.max(1, Math.ceil(duration / clamp(Math.trunc(rpm / 16), 1, 512))) + 1;
}

export function crushingTicks(rpm: number, duration: number, batch: number, delay: number): number {
  if (rpm <= 0) return Infinity;
  // The controller uses Java floats. It keeps the remaining timer after applying the recipe,
  // then stops dividing its speed by the logarithm of the input stack size.
  const f = Math.fround;
  const speed = f(f(rpm / 50) * 4);
  const ratio = f(f(Math.log(batch)) / f(Math.log(2)));
  const before = Math.min(20, Math.max(.25, f(speed / ratio)));
  const after = Math.min(20, Math.max(.25, speed));
  let remaining = f(duration);
  let ticks = 0;
  do {
    remaining = f(remaining - before);
    ticks++;
  } while (remaining >= 20);
  return ticks + Math.max(1, Math.ceil(remaining / after)) + delay;
}

export function sawTicks(rpm: number, duration: number, batch: number): number {
  if (rpm <= 0) return Infinity;
  const f = Math.fround;
  const step = clamp(f(rpm / 24), 1, 128);
  let ticks = 1;
  let remaining = f(duration * Math.max(1, Math.floor(batch / 5)));
  do {
    remaining = f(remaining - step);
    ticks++;
  } while (remaining >= 5);
  remaining = 20;
  do {
    remaining = f(remaining - step);
    ticks++;
  } while (remaining > 0);
  return ticks;
}

export function deployerBeltTicks(rpm: number, beltRpm: number): number {
  if (rpm <= 0 || beltRpm <= 0) return Infinity;
  const half = Math.ceil(1000 / clamp(Math.trunc(rpm * 2), 8, 512)) + 1;
  return half + Math.max(half, Math.ceil(480 / beltRpm));
}

export function crafterTicks(rpm: number, pathLength: number, inputDelay = 0): number {
  if (rpm <= 0) return Infinity;
  const speed = clamp(Math.trunc(rpm), 4, 250);
  const countDown = (amount: number) => Math.floor(amount / speed) + 1;
  return pathLength * countDown(1) + (pathLength - 1) * countDown(1000) + countDown(2000) + inputDelay;
}

export function fanBeltTicks(batch: number): number {
  return 150 * Math.ceil(batch / 16) + 2;
}

export function blockBreakingTicks(rpm: number, hardness: number, regenerationTicks: number): number {
  if (rpm <= 0 || hardness < 0) return Infinity;
  return breakProgressTicks(rpm, hardness) + Math.max(1, regenerationTicks);
}

function breakProgressTicks(rpm: number, hardness: number): number {
  if (hardness === 0) return 0;
  const ratio = Math.fround(Math.fround(rpm / 100) / Math.fround(hardness));
  const hits = Math.ceil(10 / clamp(Math.trunc(ratio), 1, 10));
  const interval = Math.trunc(Math.fround(1 / ratio)) + 1;
  return (hits - 1) * interval;
}

export function optimizedDrillTicks(rpm: number, hardness: number): number {
  if (rpm <= 0 || hardness < 0) return Infinity;
  // The block stays in place. The breaker rearms on the next lazy tick (period 11),
  // then performs its first hit one tick later.
  return (Math.floor((1 + breakProgressTicks(rpm, hardness)) / 11) + 1) * 11;
}

export const DRAIN_TICKS = 29;
export function funnelTicks(extractionTimer = 8): number {
  return Math.max(1, Math.trunc(extractionTimer)) + 1;
}

export const PACKAGER_MODES = [
  { id: 'queued', label: 'Stock Link · queued output', ticks: 21 },
  { id: 'unpack', label: 'Unpacking into inventory', ticks: 20 },
  { id: 'pulse', label: 'Individual redstone pulses', ticks: 40 },
  { id: 'held', label: 'Held redstone signal · steady state', ticks: 22 },
] as const;

export function packagerPayload(slots: number, stack: number, bulky: boolean): number {
  return bulky ? 1 : clamp(Math.trunc(slots), 1, 9) * clamp(Math.trunc(stack), 1, 64);
}

export const GENERATORS = [
  { id: 'small', label: 'Water Wheel', rpm: 8, su: 256 },
  { id: 'large', label: 'Large Water Wheel', rpm: 4, su: 512 },
  { id: 'windmill', label: 'Windmill Bearing', rpm: 16, su: 8192 },
  { id: 'steam', label: 'Steam Engine', rpm: 64, su: 16384 },
  { id: 'crank', label: 'Hand Crank', rpm: 32, su: 256 },
  { id: 'valve', label: 'Copper Valve Handle', rpm: 32, su: 256 },
  { id: 'creative', label: 'Creative Motor', rpm: 256, su: 4194304 },
] as const;

export interface Power {
  rpm: number;
  su: number;
}

export function windmillPower(sails: number): Power {
  const rpm = sails >= 8 ? clamp(Math.floor(sails / 8), 1, 16) : 0;
  return { rpm, su: rpm * 512 };
}

export function steamPower(tanks: number, heat: number, water: number, engines: number, passive: boolean): Power {
  const limit = Math.min(18, Math.floor(tanks / 4), Math.floor(Math.ceil(water) / 10));
  const efficiency = limit <= 0 || engines <= 0
    ? 0
    : heat > 0 ? Math.min(1, Math.min(limit, heat) / engines) : passive ? 1 / (8 * engines) : 0;
  if (efficiency === 0) return { rpm: 0, su: 0 };

  const ratio = efficiency >= 1 ? 4 : 1 + Math.min(2, Math.floor(efficiency * 4));
  return { rpm: 16 * ratio, su: 16384 * efficiency * engines };
}
