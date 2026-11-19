import { Recipe, RecipeCatalog, sequenceRates } from '../create/recipes';
import { buildPlan, PlannerSettings } from './production-plan';

const makeOutput = (item: string, amount = 1, chance = 1) => ({ item, amount, chance });
const ingredient = (amount: number, ...choices: string[]) => ({ choices, amount });

const sheet: Recipe = {
  id: 'test:sheet', machine: 'press',
  inputs: [ingredient(1, 'test:ingot')], outputs: [makeOutput('test:sheet')],
};
const mechanism: Recipe = {
  id: 'test:mechanism', machine: 'sequence',
  inputs: [ingredient(1, 'test:sheet'), ingredient(500, 'fluid:minecraft:water')],
  outputs: [makeOutput('test:mechanism', 1, .8), makeOutput('test:slag', 1, .2)],
  loops: 5, sequence: [{ machine: 'spout', ticks: 0 }, { machine: 'press', ticks: 0 }],
};

function settings(): PlannerSettings {
  return {
    rpm: 256, beltRpm: 128, batch: 16, limits: {}, recipes: {}, ingredients: {},
    goals: [{ item: 'test:mechanism', rate: 60 }, { item: 'test:sheet', rate: 15 }],
  };
}

describe('Factory production plan', () => {
  it('aggregates shared requirements and accounts for probabilistic yields, fluids and steps', () => {
    const plan = buildPlan(new RecipeCatalog([sheet, mechanism]), settings());
    expect(plan.stages.map(stage => stage.crafts)).toEqual([37500, 90, 75]);
    expect(plan.external).toEqual([{ item: 'test:ingot', rate: 90 }]);
    expect(plan.byproducts).toEqual([{ item: 'test:slag', rate: 15 }]);
    expect(plan.stages[2].equipment.find(machine => machine.machine === 'spout')?.installed).toBe(7);
    expect(plan.capacity).toBe(1);
  });

  it('detects a limited or stopped stage and respects alternative supplies', () => {
    const configuration = settings();
    configuration.limits['test:mechanism/spout'] = 1;
    const catalog = new RecipeCatalog([sheet, mechanism]);
    expect(buildPlan(catalog, configuration).capacity).toBeCloseTo(1200 / (75 * 105));
    configuration.rpm = 0;
    expect(buildPlan(catalog, configuration).capacity).toBe(0);
    configuration.recipes['test:mechanism'] = '';
    const plan = buildPlan(catalog, configuration);
    expect(plan.stages.length).toBe(1);
    expect(plan.external).toContain({ item: 'test:mechanism', rate: 60 });
  });

  it('leaves a cyclic input as a separate external flow', () => {
    const ingot: Recipe = {
      id: 'test:recycling', machine: 'manual',
      inputs: [ingredient(1, 'test:sheet')], outputs: [makeOutput('test:ingot')],
    };
    const configuration = settings();
    configuration.goals = [{ item: 'test:sheet', rate: 25 }];
    const plan = buildPlan(new RecipeCatalog([sheet, ingot]), configuration);
    expect(plan.cycles).toEqual(['test:sheet']);
    expect(plan.external).toEqual([{ item: 'test:sheet', rate: 25 }]);
  });

  it('prefers bulk fan processing and keeps explicit furnace or gravel-washing routes', () => {
    const iron = 'minecraft:iron_ingot';
    const nugget = 'minecraft:iron_nugget';
    const gravel = 'minecraft:gravel';
    const furnace: Recipe = {
      id: 'minecraft:iron_ingot_from_blasting_raw_iron', machine: 'blasting',
      inputs: [ingredient(1, 'minecraft:raw_iron')], outputs: [makeOutput(iron)],
    };
    const fan: Recipe = { ...furnace, id: 'create:fan_blasting/minecraft/iron_ingot_from_smelting_raw_iron', machine: 'fan_blasting' };
    const compacting: Recipe = {
      id: 'create:compacting/minecraft/iron_ingot_from_nuggets', machine: 'compacting',
      inputs: [ingredient(9, nugget)], outputs: [makeOutput(iron)],
    };
    const washing: Recipe = {
      id: 'create:splashing/gravel', machine: 'splashing',
      inputs: [ingredient(1, gravel)], outputs: [makeOutput('minecraft:flint', 1, .25), makeOutput(nugget, 1, .125)],
    };
    const catalog = new RecipeCatalog([furnace, fan, compacting, washing]);
    const configuration = settings();
    configuration.goals = [{ item: iron, rate: 16 }];
    expect(buildPlan(catalog, configuration).stages[0].recipe).toBe(fan);
    configuration.recipes[iron] = furnace.id;
    expect(buildPlan(catalog, configuration).stages[0].recipe).toBe(furnace);
    configuration.recipes = { [iron]: compacting.id, [nugget]: washing.id };
    const result = buildPlan(catalog, configuration);
    expect(result.stages.map(stage => stage.recipe)).toEqual([washing, compacting]);
    expect(result.stages[1].basins).toBe(result.stages[1].equipment[0].installed);
    expect(result.external).toEqual([{ item: gravel, rate: 1152 }]);
    expect(result.byproducts).toEqual([{ item: 'minecraft:flint', rate: 288 }]);
  });

  it('sizes crop plots from site yield and interval and reports shortage without charging machine stress', () => {
    const catalog = new RecipeCatalog([]);
    const configuration = settings();
    const wheat = 'minecraft:wheat';
    const wheatFarm = 'planner:farm/wheat';
    configuration.goals = [{ item: wheat, rate: 4 }];
    expect(buildPlan(catalog, configuration).stages[0].recipe.id).toBe(wheatFarm);
    configuration.recipes[wheat] = '';
    expect(buildPlan(catalog, configuration).external).toEqual([{ item: wheat, rate: 4 }]);
    delete configuration.recipes[wheat];
    configuration.farms = { [wheatFarm]: { minutes: 5, yield: 2, plots: 5 } };
    const plan = buildPlan(catalog, configuration);
    expect(plan.plots).toBe(5);
    expect(plan.stages[0].crafts).toBe(2);
    expect(plan.stages[0].farm?.needed).toBe(10);
    expect(plan.capacity).toBe(.5);
    expect(plan.stress).toBe(0);

    const oak = 'minecraft:oak_log';
    configuration.goals = [{ item: oak, rate: 10 }];
    expect(buildPlan(catalog, configuration).external).toEqual([{ item: 'minecraft:oak_sapling', rate: 2 }]);
  });

  it('uses all four block generators automatically and applies their actual drill hardness', () => {
    const configuration = settings();
    const stone = ['minecraft:cobblestone', 'minecraft:basalt', 'create:limestone', 'create:scoria'];
    configuration.rpm = 128;
    configuration.goals = stone.map(item => ({ item, rate: 120 }));
    const catalog = new RecipeCatalog([]);
    const plan = buildPlan(catalog, configuration);
    expect(plan.external).toEqual([]);
    expect(stone.map(item => plan.stages.find(stage => stage.item === item)?.equipment[0].needed))
      .toEqual([2.2, 1.1, 1.1, 2.2]);
    expect(plan.blocks).toBe(10);
    expect(plan.stress).toBe(10 * 4 * 128);
  });

  it('uses default bottomless fluids, honors external supplies and allows configured placeable fluids', () => {
    const catalog = new RecipeCatalog([]);
    const configuration = settings();
    const water = 'fluid:minecraft:water';
    const lava = 'fluid:minecraft:lava';
    const chocolate = 'fluid:create:chocolate';
    configuration.goals = [water, lava, chocolate].map(item => ({ item, rate: 1000 }));
    const plan = buildPlan(catalog, configuration);
    expect(plan.stages.map(stage => stage.item)).toEqual([lava, water]);
    expect(plan.external).toEqual([{ item: chocolate, rate: 1000 }]);
    expect(plan.stress).toBe(0);
    configuration.recipes[water] = '';
    configuration.recipes[chocolate] = 'planner:bottomless/create:chocolate';
    const overridden = buildPlan(catalog, configuration);
    expect(overridden.stages.map(stage => stage.item)).toEqual([chocolate, lava]);
    expect(overridden.external).toEqual([{ item: water, rate: 1000 }]);
    expect(catalog.producers('fluid:minecraft:milk')).toEqual([]);
  });

  it('distinguishes serial operation from a dedicated assembly pipeline', () => {
    const rates = sequenceRates(mechanism, settings());
    expect(rates.success).toBe(.8);
    expect(rates.serialTicks).toBe(160);
    expect(rates.serialOutput).toBeCloseTo(6);
    expect(rates.pipelineOutput).toBeCloseTo(1200 * .8 / 105);
  });
});
