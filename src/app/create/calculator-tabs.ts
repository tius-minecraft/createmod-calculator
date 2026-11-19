import type { CalculatorData } from '../calculator/calculator.model';
import { g_calculatorsData } from '../calculator/constants';
import { GENERATORS } from './kinetics';
import { iconPath } from './tool-icons';

export type GeneratorId = typeof GENERATORS[number]['id'];

const GENERATOR_ROUTES: Record<GeneratorId, { id: string; icon: string; caption?: string }> = {
  small: { id: 'water-wheel', icon: 'water-wheel' },
  large: { id: 'large-water-wheel', icon: 'large-water-wheel', caption: 'Large Wheel' },
  windmill: { id: 'windmill', icon: 'windmill-bearing', caption: 'Windmill' },
  steam: { id: 'steam-engine', icon: 'steam-engine' },
  crank: { id: 'hand-crank', icon: 'hand-crank' },
  valve: { id: 'valve-handle', icon: 'copper-valve-handle', caption: 'Valve Handle' },
  creative: { id: 'creative-motor', icon: 'creative-motor' },
};

export const GENERATOR_TABS = GENERATORS.map(generator => {
  const { id, icon, caption } = GENERATOR_ROUTES[generator.id];
  return {
    id,
    name: generator.label,
    caption,
    iconPath: iconPath(icon),
    wikiPage: 'https://mc-wiki.net/create/' + icon + '/',
    generator,
  };
});

export const PLANNER_TAB: CalculatorData = {
  id: 'planner',
  name: 'Factory planner',
  caption: 'Planner',
  iconPath: iconPath('cogwheel'),
};

export const WORKSHOP_TABS: CalculatorData[] = [
  { id: 'spout', name: 'Spout', iconPath: iconPath('spout'), wikiPage: 'https://mc-wiki.net/create/spout/' },
  { id: 'sequence', name: 'Sequenced Assembly', caption: 'Assembly', iconPath: iconPath('precision-mechanism'),
    wikiPage: 'https://create.fandom.com/wiki/Sequenced_Assembly' },
  { id: 'packager', name: 'Packager', iconPath: iconPath('packager'), wikiPage: 'https://mc-wiki.net/create/packager/' },
  { id: 'logistics', name: 'Funnel & Item Drain', caption: 'Funnels & Drain', iconPath: iconPath('brass-funnel') },
];

const LOGISTICS = new Set(['belt', 'arm', 'pump', 'packager', 'logistics']);
const machineTabs: CalculatorData[] = g_calculatorsData.map(tab => ({
  ...tab,
  caption: tab.name.replace(/^(Mechanical |Encased )/, ''),
}));

export const TAB_GROUPS = [
  { id: 'processing', label: 'Processing', tabs: [...machineTabs, ...WORKSHOP_TABS].filter(tab => !LOGISTICS.has(tab.id)) },
  { id: 'logistics', label: 'Logistics', tabs: [...machineTabs, ...WORKSHOP_TABS].filter(tab => LOGISTICS.has(tab.id)) },
  { id: 'generators', label: 'Generators', tabs: GENERATOR_TABS },
  { id: 'planning', label: 'Planning', tabs: [PLANNER_TAB] },
];

export const CALCULATOR_TABS = TAB_GROUPS.flatMap(group => group.tabs);

export function generatorRoute(id: GeneratorId): string {
  return GENERATOR_ROUTES[id].id;
}
