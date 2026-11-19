import { optimizedDrillTicks } from './kinetics';
import type { Recipe } from './recipes';

export interface BlockGenerator {
  hardness: number;
  material: string;
  ground?: string;
  formation: string;
}

export function resourceSourceId(recipe: Recipe): string {
  return recipe.outputs[0].item.split(':').at(-1)!;
}

export function generatorCollection(generator: BlockGenerator): string {
  return generator.ground
    ? 'Place an upward-flowing Chute directly above the basalt. The Soul Soil below must stay in place.'
    : 'Collect directly below the target with a Belt or a Hopper, or directly above it with an upward-flowing Chute.';
}

function generator(id: string, item: string, profile: BlockGenerator): Recipe {
  return { id, machine: 'drill', inputs: [], outputs: [{ item, amount: 1, chance: 1 }], generator: profile };
}

export const BLOCK_GENERATORS = [
  generator('planner:optimized_cobblestone_generator', 'minecraft:cobblestone', {
    hardness: 2,
    material: 'minecraft:water_bucket',
    formation: 'Guide flowing lava into water at the block in front of the Mechanical Drill.',
  }),
  generator('planner:generator/basalt', 'minecraft:basalt', {
    hardness: 1.25,
    material: 'minecraft:blue_ice',
    ground: 'minecraft:soul_soil',
    formation: 'Put Soul Soil under the target and Blue Ice against the side. Let lava flow into the target.',
  }),
  generator('planner:generator/limestone', 'create:limestone', {
    hardness: 1.25,
    material: 'create:honey_bucket',
    formation: 'Guide flowing lava into placed honey. Source lava at the contact would produce obsidian.',
  }),
  generator('planner:generator/scoria', 'create:scoria', {
    hardness: 1.5,
    material: 'create:chocolate_bucket',
    formation: 'Guide flowing lava into placed chocolate. Source lava at the contact would produce obsidian.',
  }),
];

export function generatorTicks(generator: BlockGenerator, rpm: number): number {
  return optimizedDrillTicks(rpm, generator.hardness);
}

export const DEFAULT_BOTTOMLESS_THRESHOLD = 10_000;
const VANILLA_BOTTOMLESS = ['fluid:minecraft:water', 'fluid:minecraft:lava'];

export const BOTTOMLESS_SUPPLIES: Recipe[] = [
  ...VANILLA_BOTTOMLESS,
  'fluid:create:honey',
  'fluid:create:chocolate',
].map(item => ({
  id: 'planner:bottomless/' + item.slice(6),
  machine: 'bottomless',
  inputs: [],
  outputs: [{ item, amount: 1, chance: 1 }],
  bottomless: VANILLA_BOTTOMLESS.includes(item) ? 'default' : 'configured',
}));
