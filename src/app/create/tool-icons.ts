import type { GENERATORS } from './kinetics';
import type { Machine } from './recipes';

export const FACTORY_TABS = [
  { id: 'planner', label: 'Planner', icon: 'cogwheel' },
  { id: 'generators', label: 'Generators', icon: 'steam-engine' },
  { id: 'packager', label: 'Packager', icon: 'packager' },
  { id: 'spout', label: 'Spout', icon: 'spout' },
  { id: 'sequence', label: 'Assembly', icon: 'precision-mechanism' },
  { id: 'logistics', label: 'Logistics', icon: 'brass-funnel' },
] as const;

export const MACHINE_ICONS: Partial<Record<Machine, string>> = {
  drill: 'drill',
  press: 'press',
  mixer: 'mixer',
  millstone: 'millstone',
  crushing: 'crushing',
  saw: 'saw',
  deployer: 'deployer',
  crafter: 'crafter',
  spout: 'spout',
  drain: 'item-drain',
  splashing: 'fan',
  haunting: 'fan',
  sequence: 'precision-mechanism',
};

export const GENERATOR_ICONS: Partial<Record<typeof GENERATORS[number]['id'], string>> = {
  windmill: 'windmill-bearing',
  steam: 'steam-engine',
  crank: 'hand-crank',
  creative: 'creative-motor',
};

export function iconPath(icon: string): string {
  return 'assets/icons/' + icon + '.png';
}
