import type { Ingredient, Output, Recipe } from './recipes';

export interface FarmProfile {
  method: string;
  minutes: number;
  setup: string;
  equipment: string[];
  soil: string;
  planting: string;
  scene: 'field' | 'column' | 'fruit' | 'cocoa' | 'tree';
}

const wheatSeedSurplus = 3 * 4 / 7 - 1;
const rootCropYield = 3 * 4 / 7;

function drop(name: string, amount = 1, chance = 1): Output {
  return { item: 'minecraft:' + name, amount, chance };
}

const HARVESTER = 'create:mechanical_harvester';
const SAW = 'create:mechanical_saw';
const DRILL = 'create:mechanical_drill';

const tools: Record<string, string> = {
  [HARVESTER]: 'Mechanical Harvester',
  [SAW]: 'Mechanical Saw',
  [DRILL]: 'Mechanical Drill',
  'create:deployer': 'Deployer',
};

function farm(
  id: string, outputs: Output[], minutes: number, setup: string,
  options: Partial<Pick<FarmProfile, 'equipment' | 'soil' | 'scene' | 'planting'>> = {}, inputs: Ingredient[] = [],
): Recipe {
  const equipment = options.equipment ?? [HARVESTER];
  const profile: FarmProfile = {
    method: equipment.map(item => tools[item]).join(' + '),
    setup,
    minutes,
    equipment,
    soil: options.soil ?? 'minecraft:farmland',
    planting: options.planting ?? outputs[0].item,
    scene: options.scene ?? 'field',
  };
  return { id: 'planner:farm/' + id, machine: 'farm', inputs, outputs, farm: profile };
}

const farmland = 'Run a Mechanical Harvester over mature crops on hydrated farmland. Start with planted plots and leave automatic replanting on.';

const fields = [
  farm('wheat', [drop('wheat'), drop('wheat_seeds', wheatSeedSurplus)], 30, farmland, { planting: 'minecraft:wheat_seeds' }),
  farm('potato', [drop('potato', rootCropYield), drop('poisonous_potato', 1, .02)], 30, farmland),
  farm('carrot', [drop('carrot', rootCropYield)], 30, farmland),
  farm('beetroot', [drop('beetroot'), drop('beetroot_seeds', wheatSeedSurplus)], 20, farmland, { planting: 'minecraft:beetroot_seeds' }),
  farm('nether_wart', [drop('nether_wart', 2)], 34, 'Run a Mechanical Harvester over mature Nether Wart on Soul Sand and leave automatic replanting on.',
    { soil: 'minecraft:soul_sand' }),
  farm('sweet_berries', [drop('sweet_berries', 1.5)], 12, 'Harvest mature berry bushes. The Harvester returns them to age 1 and retains one berry for replanting.',
    { soil: 'minecraft:grass_block' }),
  farm('cocoa', [drop('cocoa_beans', 2)], 8, 'Run the Harvester past cocoa pods on Jungle Logs. Leave room for the pods and automatic replanting.',
    { soil: 'minecraft:jungle_log', scene: 'cocoa' }),
  farm('sugar_cane', [drop('sugar_cane')], 18, 'Cut the block above the base of each Sugar Cane plant. Keep the base next to water.',
    { scene: 'column', soil: 'minecraft:grass_block' }),
  farm('kelp', [drop('kelp')], 6, 'Cut the next block above each submerged Kelp base. Leave the base in place to regrow.',
    { scene: 'column', soil: 'minecraft:sand' }),
  farm('bamboo', [drop('bamboo')], 4, 'Pass a Mechanical Saw above the base of each Bamboo stalk and collect the drops.',
    { equipment: [SAW], scene: 'column', soil: 'minecraft:grass_block' }),
  farm('cactus', [drop('cactus')], 18, 'Break the growth above each Cactus base with a Mechanical Drill and collect the drops clear of the cactus.',
    { equipment: [DRILL], scene: 'column', soil: 'minecraft:sand' }),
  farm('pumpkin', [drop('pumpkin')], 15, 'Break the Pumpkin where it appears beside a mature planted stem. Leave the stem in place.',
    { equipment: [DRILL], scene: 'fruit', planting: 'minecraft:pumpkin_seeds' }),
  farm('melon', [drop('melon_slice', 5)], 15, 'Break the Melon where it appears beside a mature planted stem. Leave the stem in place.',
    { equipment: [DRILL], scene: 'fruit', planting: 'minecraft:melon_seeds' }),
];

const trees = [
  { type: 'oak', logs: 5, minutes: 30 },
  { type: 'spruce', logs: 7, minutes: 30 },
  { type: 'birch', logs: 6, minutes: 30 },
  { type: 'jungle', logs: 6, minutes: 30 },
  { type: 'acacia', logs: 7, minutes: 30 },
  { type: 'dark_oak', logs: 24, minutes: 30, saplings: 4 },
  { type: 'cherry', logs: 7, minutes: 30 },
  { type: 'mangrove', logs: 9, minutes: 35, plantingItem: 'mangrove_propagule' },
];

export const FARM_RECIPES = [
  ...fields,
  ...trees.map(({ type, logs, minutes, saplings = 1, plantingItem = type + '_sapling' }) =>
    farm(type + '_tree', [drop(type + '_log', logs)], minutes,
      (saplings === 4 ? 'Plant four saplings in a 2 × 2 square. ' : '')
      + 'Move the saw across the base of each grown tree and use a Deployer to replant. Feed planting items from storage or collect them from the leaves. Log yield and growth time vary by tree shape and layout.',
      { equipment: [SAW, 'create:deployer'], soil: 'minecraft:grass_block', scene: 'tree', planting: 'minecraft:' + plantingItem },
      [{ choices: ['minecraft:' + plantingItem], amount: saplings }])),
];
