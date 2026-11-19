import { OPERATIONS_PER_MINUTE } from '../create/kinetics';
import {
  expectedYield, Ingredient, MachineSettings, MACHINES, Recipe, RecipeCatalog, recipeWork, TimedMachine,
} from '../create/recipes';

export interface Goal {
  item: string;
  rate: number;
}

export interface PlannerSettings extends MachineSettings {
  goals: Goal[];
  recipes: Record<string, string>;
  ingredients: Record<string, string>;
  limits: Partial<Record<string, number>>;
}

export interface MaterialRate {
  item: string;
  rate: number;
}

export interface PlannedInput extends MaterialRate {
  ingredient: Ingredient;
  key: string;
  external: boolean;
}

export interface PlannedMachine {
  machine: TimedMachine;
  needed: number;
  installed: number;
  utilization: number;
  blocks: number;
  stress: number;
}

export interface PlanStage {
  item: string;
  recipe: Recipe;
  depth: number;
  rate: number;
  crafts: number;
  input: PlannedInput[];
  equipment: PlannedMachine[];
  support: number;
  capacity: number;
}

export interface Plan {
  stages: PlanStage[];
  external: MaterialRate[];
  byproducts: MaterialRate[];
  cycles: string[];
  stress: number;
  blocks: number;
  capacity: number;
}

const COMMON_EXTERNAL = new Set([
  'minecraft:andesite', 'minecraft:diorite', 'minecraft:granite', 'minecraft:quartz', 'minecraft:obsidian',
  'minecraft:deepslate', 'minecraft:dirt', 'minecraft:netherrack', 'minecraft:string', 'minecraft:leather',
  'minecraft:wheat', 'minecraft:sugar_cane', 'minecraft:bamboo', 'minecraft:cocoa_beans', 'minecraft:coal',
  'minecraft:lapis_lazuli', 'minecraft:redstone', 'minecraft:diamond', 'minecraft:emerald',
  'minecraft:netherite_scrap', 'minecraft:amethyst_shard', 'minecraft:prismarine_shard', 'minecraft:sweet_berries',
  'minecraft:nether_wart', 'minecraft:bone', 'create:crimsite', 'create:asurine', 'create:ochrum', 'create:veridium', 'minecraft:blaze_rod', 'minecraft:egg', 'minecraft:apple',
  'fluid:minecraft:water', 'fluid:minecraft:lava', 'fluid:minecraft:milk',
]);

const PREFERRED_INGREDIENTS = [
  'minecraft:oak_planks', 'minecraft:oak_log', 'minecraft:stone', 'minecraft:cobblestone',
  'minecraft:glass', 'minecraft:sand', 'minecraft:iron_nugget',
];

export function selectRecipe(item: string, catalog: RecipeCatalog, settings: PlannerSettings): Recipe | undefined {
  const recipes = catalog.producers(item);
  const selection = settings.recipes[item];
  if (selection !== undefined) return recipes.find(recipe => recipe.id === selection);

  if (COMMON_EXTERNAL.has(item) || /:(?:raw_|stripped_)?[^:]*_(?:ore|log|stem)$|:raw_[^:]+$/.test(item)) {
    return undefined;
  }

  const primary = recipes.filter(recipe =>
    (recipe.outputs[0].item === item || recipe.machine === 'drain')
    && !recipe.inputs.some((input, index) => ingredientChoice(input, settings.ingredients[recipe.id + '/' + index]) === item)
  );
  return primary.sort((a, b) => preference(a, item) - preference(b, item))[0];
}

function preference(recipe: Recipe, item: string): number {
  if (recipe.id.startsWith('planner:')) return -100;
  if (recipe.id.includes('from_blasting_raw_')) return -10;
  if (recipe.id.includes('from_smelting_raw_')) return -9;
  if (recipe.id.includes('/raw_') && !recipe.id.endsWith('_block')) return -8;
  if (recipe.id.endsWith('_from_raw_ore')) return -7;
  if (recipe.id.includes('from_nuggets') || recipe.id.includes('from_block') || recipe.id.includes('recycling')) return 30;
  if (recipe.machine === 'sequence') return -5;
  if (recipe.machine === 'deployer' && recipe.tools?.length) return 10;
  if (recipe.machine === 'manual' && recipe.id.startsWith('create:crafting/')) return 5;
  if (recipe.machine === 'manual') return 6;
  if (recipe.id.startsWith('create:') && recipe.outputs[0].item === item) return 0;
  return 2;
}

export function ingredientChoice(ingredient: Ingredient, saved: string | undefined): string {
  if (saved && ingredient.choices.includes(saved)) return saved;
  return PREFERRED_INGREDIENTS.find(item => ingredient.choices.includes(item)) ?? ingredient.choices[0];
}

interface Connection {
  item: string;
  ingredient: Ingredient;
  key: string;
  external: boolean;
}

interface Node {
  recipe: Recipe;
  input: Connection[];
  depth: number;
}

export function buildPlan(catalog: RecipeCatalog, settings: PlannerSettings): Plan {
  const nodes = new Map<string, Node>();
  const active = new Set<string>();
  const order: string[] = [];
  const cycles = new Set<string>();

  function visit(item: string): Node | undefined {
    if (nodes.has(item)) return nodes.get(item);
    const recipe = selectRecipe(item, catalog, settings);
    if (!recipe) return undefined;

    active.add(item);
    const input = recipe.inputs.map((ingredient, index) => {
      const key = recipe.id + '/' + index;
      const source = ingredientChoice(ingredient, settings.ingredients[key]);
      if (active.has(source)) {
        cycles.add(source);
        return { item: source, ingredient, key, external: true };
      }
      return { item: source, ingredient, key, external: visit(source) === undefined };
    });
    active.delete(item);

    const depth = 1 + Math.max(0, ...input.map(connection => connection.external ? 0 : nodes.get(connection.item)!.depth));
    const node = { recipe, input, depth };
    nodes.set(item, node);
    order.push(item);
    return node;
  }

  const demand = new Map<string, number>();
  const external = new Map<string, number>();
  const byproducts = new Map<string, number>();

  for (const goal of settings.goals) {
    if (!Number.isFinite(goal.rate) || goal.rate <= 0) continue;
    add(visit(goal.item) ? demand : external, goal.item, goal.rate);
  }

  const stages: PlanStage[] = [];
  for (const item of order.reverse()) {
    const { recipe, input, depth } = nodes.get(item)!;
    const rate = demand.get(item) ?? 0;
    const crafts = rate / expectedYield(recipe, item);
    const connections = input.map(connection => {
      const quantity = crafts * connection.ingredient.amount;
      add(connection.external ? external : demand, connection.item, quantity);
      return { ...connection, rate: quantity };
    });

    for (const output of recipe.outputs) {
      if (output.item !== item) add(byproducts, output.item, crafts * output.amount * output.chance);
    }

    const machineWork = new Map<TimedMachine, { ticks: number; units: number }>();
    for (const work of recipeWork(recipe, settings)) {
      const existing = machineWork.get(work.machine);
      machineWork.set(work.machine, { ticks: (existing?.ticks ?? 0) + work.ticks, units: work.units });
    }
    const equipment = [...machineWork].map(([machine, work]) => {
      const needed = crafts * work.ticks / OPERATIONS_PER_MINUTE;
      const configured = settings.limits[item + '/' + machine];
      const installed = configured ?? (Number.isFinite(needed) ? Math.ceil(needed - 1e-9) : 0);
      return {
        machine, needed, installed, utilization: installed > 0 ? needed / installed : Infinity,
        blocks: installed * work.units,
        stress: installed * work.units * MACHINES[machine].stress * settings.rpm,
      };
    });
    const capacity = Math.min(1, ...equipment.map(machine => machine.installed / machine.needed));
    const support = recipe.heat ? equipment.find(machine => machine.machine === 'mixer')?.installed ?? 0 : 0;
    stages.push({ item, recipe, depth, rate, crafts, input: connections, equipment, capacity, support });
  }

  return {
    stages: stages.sort((a, b) => a.depth - b.depth || a.item.localeCompare(b.item)),
    external: entries(external),
    byproducts: entries(byproducts),
    cycles: [...cycles],
    stress: stages.reduce((total, section) => total + section.equipment.reduce((sum, machine) => sum + machine.stress, 0), 0),
    blocks: stages.reduce((total, section) =>
      total + section.support + section.equipment.reduce((sum, machine) => sum + machine.blocks * (machine.machine === 'crushing' ? 2 : 1), 0), 0),
    capacity: Math.min(1, ...stages.map(section => section.capacity)),
  };
}

function add(map: Map<string, number>, item: string, amount: number) {
  map.set(item, (map.get(item) ?? 0) + amount);
}

function entries(map: Map<string, number>): MaterialRate[] {
  return [...map].map(([item, rate]) => ({ item, rate })).sort((a, b) => b.rate - a.rate);
}
