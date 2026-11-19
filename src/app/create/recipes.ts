import {
  crafterTicks, crushingTicks, deployerBeltTicks, DRAIN_TICKS, fanBeltTicks, millstoneTicks,
  mixerTicks, OPERATIONS_PER_MINUTE, optimizedDrillTicks, pressTicks, sawTicks, SPOUT_TICKS
} from './kinetics';
import { FARM_RECIPES, type FarmProfile } from './farm-recipes';
import { BLOCK_GENERATORS, BOTTOMLESS_SUPPLIES, generatorTicks, type BlockGenerator } from './resource-sources';

export const MACHINES = {
  drill: { label: 'Mechanical Drill', stress: 4 },
  press: { label: 'Mechanical Press', stress: 8 },
  compacting: { label: 'Mechanical Press + Basin', stress: 8 },
  mixer: { label: 'Mechanical Mixer', stress: 4 },
  millstone: { label: 'Millstone', stress: 4 },
  crushing: { label: 'Crushing Wheel pair', stress: 16 },
  saw: { label: 'Mechanical Saw', stress: 4 },
  deployer: { label: 'Deployer', stress: 4 },
  crafter: { label: 'Mechanical Crafter', stress: 2 },
  spout: { label: 'Spout', stress: 0 },
  drain: { label: 'Item Drain', stress: 0 },
  splashing: { label: 'Fan · washing', stress: 2 },
  haunting: { label: 'Fan · haunting', stress: 2 },
  fan_blasting: { label: 'Fan · bulk blasting', stress: 2 },
  fan_smoking: { label: 'Fan · bulk smoking', stress: 2 },
  farm: { label: 'Farm', stress: 0 },
  bottomless: { label: 'Hose Pulley · bottomless supply', stress: 0 },
  furnace: { label: 'Furnace', stress: 0 },
  blasting: { label: 'Blast Furnace', stress: 0 },
  smoking: { label: 'Smoker', stress: 0 },
  campfire: { label: 'Campfire', stress: 0 },
  polishing: { label: 'Sandpaper', stress: 0 },
  stonecutter: { label: 'Stonecutter', stress: 0 },
  manual: { label: 'Crafting / manual application', stress: 0 },
  sequence: { label: 'Sequenced Assembly', stress: 0 },
} satisfies Record<string, { label: string; stress: number }>;

export type Machine = keyof typeof MACHINES;
export type TimedMachine = Exclude<Machine, 'manual' | 'stonecutter' | 'polishing' | 'sequence' | 'farm' | 'bottomless'>;

export interface Ingredient {
  choices: string[];
  amount: number;
}

export interface Output {
  item: string;
  amount: number;
  chance: number;
}

export interface RecipeStep {
  machine: TimedMachine;
  ticks: number;
}

export interface Recipe {
  id: string;
  machine: Machine;
  inputs: Ingredient[];
  outputs: Output[];
  ticks?: number;
  pathLength?: number;
  slots?: number;
  heat?: 'heated' | 'superheated';
  loops?: number;
  sequence?: RecipeStep[];
  tools?: Ingredient[];
  farm?: FarmProfile;
  generator?: BlockGenerator;
  bottomless?: 'default' | 'configured';
}

export interface MachineSettings {
  rpm: number;
  beltRpm: number;
  batch: number;
}

export interface MachineWork {
  machine: TimedMachine;
  ticks: number;
  units: number;
}

export function itemName(id: string): string {
  if (id.startsWith('fluid:')) {
    const fluid = id.slice(6);
    if (fluid.includes('[')) {
      const [base, contents] = fluid.split('[');
      return itemName(base) + ' · ' + itemName(contents.slice(0, -1));
    }
    return itemName(fluid);
  }
  if (id.startsWith('#')) return '#' + id.split(':').at(-1);
  return id.split(':').at(-1)!.replace(/(^|[_/])([a-z])/g, (_, space, letter) => (space ? ' ' : '') + letter.toUpperCase());
}

export function materialUnit(item: string, amount?: number): string {
  if (item.startsWith('fluid:')) return 'mB';
  return amount === 1 ? 'item' : 'items';
}

export function recipeName(recipe: Recipe): string {
  if (recipe.generator) return itemName(recipe.outputs[0].item) + ' generator · Mechanical Drill';
  if (recipe.bottomless) return MACHINES.bottomless.label
    + (recipe.bottomless === 'configured' ? ' (server config)' : '');
  if (recipe.farm) return itemName(recipe.id.split('/').at(-1)!) + ' · ' + recipe.farm.method;
  const name = itemName(recipe.id.slice(recipe.id.lastIndexOf('/') + 1));
  return MACHINES[recipe.machine].label + ' · ' + name;
}

export class RecipeCatalog {
  readonly recipes: Recipe[];
  readonly sequences: Recipe[];
  readonly items: string[];
  private readonly byOutput = new Map<string, Recipe[]>();

  constructor(recipes: Recipe[]) {
    this.recipes = [...BLOCK_GENERATORS, ...FARM_RECIPES, ...BOTTOMLESS_SUPPLIES, ...recipes];
    this.sequences = recipes.filter(recipe => recipe.machine === 'sequence');
    const items = new Set<string>();
    for (const recipe of this.recipes) {
      for (const output of new Set(recipe.outputs.map(result => result.item))) {
        if (!this.byOutput.has(output)) this.byOutput.set(output, []);
        this.byOutput.get(output)!.push(recipe);
        items.add(output);
      }
      for (const input of recipe.inputs) input.choices.forEach(item => items.add(item));
    }
    this.items = [...items].sort((a, b) => itemName(a).localeCompare(itemName(b)) || a.localeCompare(b));
  }

  producers(item: string): Recipe[] {
    return this.byOutput.get(item) ?? [];
  }
}

let catalogPromise: Promise<RecipeCatalog> | undefined;
export function loadCatalog(): Promise<RecipeCatalog> {
  catalogPromise ??= fetch(new URL('assets/data/create-6.0.10.json', document.baseURI))
    .then(async response => {
      if (!response.ok) throw new Error('Recipe data could not be loaded.');
      return new RecipeCatalog(await response.json() as Recipe[]);
    })
    .catch(error => {
      catalogPromise = undefined;
      throw error;
    });
  return catalogPromise;
}

export function expectedYield(recipe: Recipe, item: string): number {
  return recipe.outputs.reduce((sum, output) => sum + (output.item === item ? output.amount * output.chance : 0), 0);
}

export function recipeWork(recipe: Recipe, settings: MachineSettings): MachineWork[] {
  if (recipe.sequence) {
    return recipe.sequence.map(step => ({
      machine: step.machine,
      ticks: stepTicks(step.machine, step.ticks, settings, 1) * (recipe.loops ?? 1),
      units: 1,
    }));
  }
  if (recipe.machine === 'manual' || recipe.machine === 'polishing' || recipe.machine === 'stonecutter' || recipe.machine === 'sequence' || recipe.machine === 'farm' || recipe.machine === 'bottomless') {
    return [];
  }

  const batched = ['crushing', 'saw', 'splashing', 'haunting', 'fan_blasting', 'fan_smoking'].includes(recipe.machine);
  // The global stack size cannot exceed the storage limit of the input. Common
  // Create processing inputs stack to 64. Lower the batch for other item types.
  const batch = batched ? settings.batch : 1;
  const ticks = recipe.machine === 'crafter'
    ? crafterTicks(settings.rpm, recipe.pathLength ?? 1)
    : recipe.generator ? generatorTicks(recipe.generator, settings.rpm)
      : stepTicks(recipe.machine, recipe.ticks ?? 0, settings, batch);
  return [{ machine: recipe.machine, ticks: ticks / batch, units: recipe.slots ?? 1 }];
}

function stepTicks(machine: TimedMachine, duration: number, settings: MachineSettings, batch: number): number {
  const { rpm, beltRpm } = settings;
  switch (machine) {
    case 'drill': return optimizedDrillTicks(rpm, 2);
    case 'press':
    case 'compacting': return pressTicks(rpm);
    case 'mixer': return mixerTicks(rpm, duration);
    case 'millstone': return millstoneTicks(rpm, duration);
    case 'crushing': return crushingTicks(rpm, duration, batch, 1);
    case 'saw': return sawTicks(rpm, duration || 50, batch);
    case 'deployer': return deployerBeltTicks(rpm, beltRpm);
    case 'crafter': return crafterTicks(rpm, 1);
    case 'spout': return SPOUT_TICKS;
    case 'drain': return DRAIN_TICKS;
    case 'splashing':
    case 'fan_blasting':
    case 'fan_smoking':
    case 'haunting': return rpm > 0 ? fanBeltTicks(batch) : Infinity;
    case 'campfire': return (duration || 600) / 4;
    case 'furnace': return duration || 200;
    case 'blasting':
    case 'smoking': return duration || 100;
  }
}

export function sequenceRates(recipe: Recipe, settings: MachineSettings) {
  const work = recipeWork(recipe, settings);
  const serialTicks = work.reduce((sum, step) => sum + step.ticks, 0);
  const longestStage = Math.max(...work.map(step => step.ticks / (recipe.loops ?? 1)));
  const success = recipe.outputs[0].chance;
  return {
    work,
    serialTicks,
    success,
    serialOutput: OPERATIONS_PER_MINUTE / serialTicks * expectedYield(recipe, recipe.outputs[0].item),
    pipelineOutput: OPERATIONS_PER_MINUTE / longestStage / (recipe.loops ?? 1) * expectedYield(recipe, recipe.outputs[0].item),
  };
}
