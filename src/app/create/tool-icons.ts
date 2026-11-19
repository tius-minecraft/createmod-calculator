import type { Machine } from './recipes';

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

export function iconPath(icon: string): string {
  return 'assets/icons/' + icon + '.png';
}
