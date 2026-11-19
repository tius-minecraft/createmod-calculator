import {
  crafterTicks, crushingTicks, funnelTicks, mixerTicks, optimizedDrillTicks,
  packagerPayload, PACKAGER_MODES, SPOUT_TICKS, steamPower, windmillPower,
} from './kinetics';

describe('Create 6.0.10 kinetics', () => {
  it('rearms a continuously optimized cobblestone drill on lazy ticks', () => {
    expect(optimizedDrillTicks(256, 2)).toBe(11);
    expect(optimizedDrillTicks(128, 2)).toBe(22);
    expect(optimizedDrillTicks(30, 2)).toBe(66);
    expect(optimizedDrillTicks(0, 2)).toBe(Infinity);
  });

  it('handles windmill thresholds and boiler efficiencies', () => {
    expect(windmillPower(7)).toEqual({ rpm: 0, su: 0 });
    expect(windmillPower(24)).toEqual({ rpm: 3, su: 1536 });
    expect(windmillPower(200)).toEqual({ rpm: 16, su: 8192 });
    expect(steamPower(16, 4, 40, 4, false)).toEqual({ rpm: 64, su: 65536 });
    expect(steamPower(16, 4, 40, 8, false)).toEqual({ rpm: 48, su: 65536 });
    expect(steamPower(4, 0, 10, 2, true)).toEqual({ rpm: 16, su: 2048 });
    expect(steamPower(16, 4, 9, 4, false)).toEqual({ rpm: 0, su: 0 });
  });

  it('accounts for the second phase of crushing and the crafter routing path', () => {
    expect(crushingTicks(250, 250, 1, 0)).toBe(13);
    expect(crushingTicks(250, 20, 64, 0)).toBe(2);
    expect(crafterTicks(256, 3)).toBe(22);
  });

  it('uses the mixer speed requirement, recipe duration and retraction', () => {
    expect(mixerTicks(29)).toBe(Infinity);
    expect(mixerTicks(192)).toBe(17);
    expect(mixerTicks(256, 200)).toBe(32);
    expect(mixerTicks(256, 200, false)).toBe(71);
  });

  it('uses separate package modes and spout and funnel cooldowns', () => {
    expect(PACKAGER_MODES.map(mode => mode.ticks)).toEqual([21, 20, 40, 22]);
    expect(packagerPayload(9, 64, false)).toBe(576);
    expect(packagerPayload(9, 64, true)).toBe(1);
    expect(SPOUT_TICKS).toBe(21);
    expect(funnelTicks()).toBe(9);
  });
});
