import type { Ingredient, Output, Recipe } from './recipes';

export interface FarmProfile {
  method: string;
  minutes: number;
  setup: string;
}

const wheatSeedSurplus = 3 * 4 / 7 - 1;
const rootCropYield = 3 * 4 / 7;

function drop(name: string, amount = 1, chance = 1): Output {
  return { item: 'minecraft:' + name, amount, chance };
}

function farm(id: string, outputs: Output[], method: string, minutes: number, setup: string, inputs: Ingredient[] = []): Recipe {
  return { id: 'planner:farm/' + id, machine: 'farm', inputs, outputs, farm: { method, minutes, setup } };
}

const harvester = 'Mechanical Harvester';
const farmland = 'Run a Mechanical Harvester over mature crops on hydrated farmland. Start with planted plots and leave automatic replanting on.';

const fields = [
  farm('wheat', [drop('wheat'), drop('wheat_seeds', wheatSeedSurplus)], harvester, 30, farmland),
  farm('potato', [drop('potato', rootCropYield), drop('poisonous_potato', 1, .02)], harvester, 30, farmland),
  farm('carrot', [drop('carrot', rootCropYield)], harvester, 30, farmland),
  farm('beetroot', [drop('beetroot'), drop('beetroot_seeds', wheatSeedSurplus)], harvester, 20, farmland),
  farm('nether_wart', [drop('nether_wart', 2)], harvester, 34, 'Run a Mechanical Harvester over mature Nether Wart on Soul Sand and leave automatic replanting on.'),
  farm('sweet_berries', [drop('sweet_berries', 1.5)], harvester, 12, 'Harvest mature berry bushes. The Harvester returns them to age 1 and retains one berry for replanting.'),
  farm('cocoa', [drop('cocoa_beans', 2)], harvester, 8, 'Run the Harvester past cocoa pods on Jungle Logs. Leave room for the pods and automatic replanting.'),
  farm('sugar_cane', [drop('sugar_cane')], harvester, 18, 'Cut the block above the base of each Sugar Cane plant. Keep the base next to water.'),
  farm('kelp', [drop('kelp')], harvester, 6, 'Cut the next block above each submerged Kelp base. Leave the base in place to regrow.'),
  farm('bamboo', [drop('bamboo')], 'Mechanical Saw', 4, 'Pass a Mechanical Saw above the base of each Bamboo stalk and collect the drops.'),
  farm('cactus', [drop('cactus')], 'Mechanical Drill', 18, 'Break the growth above each Cactus base with a Mechanical Drill and collect the drops clear of the cactus.'),
  farm('pumpkin', [drop('pumpkin')], 'Mechanical Drill', 15, 'Break the Pumpkin where it appears beside a mature planted stem. Leave the stem in place.'),
  farm('melon', [drop('melon_slice', 5)], 'Mechanical Drill', 15, 'Break the Melon where it appears beside a mature planted stem. Leave the stem in place.'),
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
    farm(type + '_tree', [drop(type + '_log', logs)], 'Mechanical Saw + Deployer', minutes,
      'Move the saw across the base of each grown tree and use a Deployer to replant. Feed planting items from storage or collect them from the leaves. Log yield and growth time vary by tree shape and layout.',
      [{ choices: ['minecraft:' + plantingItem], amount: saplings }])),
];
