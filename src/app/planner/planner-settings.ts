import type { FarmSettings, PlannerSettings } from './production-plan';

const STORAGE_KEY = 'create-6.0.10.factory';

const defaults: PlannerSettings = {
  goals: [{ item: 'create:precision_mechanism', rate: 60 }],
  rpm: 256, beltRpm: 128, batch: 16, recipes: {}, ingredients: {}, limits: {},
};

export function readPlannerSettings(): PlannerSettings {
  const settings = structuredClone(defaults);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<PlannerSettings> | null;
    if (Array.isArray(saved?.goals)) return { ...settings, ...saved };
  } catch {
    return settings;
  }
  return settings;
}

export function savePlannerSettings(settings: PlannerSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // The planner also works for browsers with storage disabled.
  }
}

export function setFarmSetting(settings: PlannerSettings, recipeId: string, key: keyof FarmSettings, value: number | null) {
  const farms = settings.farms ??= {};
  const configuration = farms[recipeId] ??= {};
  if (value === null || !Number.isFinite(value)) {
    delete configuration[key];
  } else if (key === 'plots') {
    configuration.plots = Math.trunc(Math.max(0, Math.min(value, 1_000_000)));
  } else {
    configuration[key] = Math.max(.001, Math.min(value, key === 'minutes' ? 1440 : 1000));
  }
}
