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
    expect(plan.stages.map(stage => stage.crafts)).toEqual([90, 75]);
    expect(plan.external).toEqual([{ item: 'fluid:minecraft:water', rate: 37500 }, { item: 'test:ingot', rate: 90 }]);
    expect(plan.byproducts).toEqual([{ item: 'test:slag', rate: 15 }]);
    expect(plan.stages[1].equipment.find(machine => machine.machine === 'spout')?.installed).toBe(7);
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

  it('distinguishes serial operation from a dedicated assembly pipeline', () => {
    const rates = sequenceRates(mechanism, settings());
    expect(rates.success).toBe(.8);
    expect(rates.serialTicks).toBe(160);
    expect(rates.serialOutput).toBeCloseTo(6);
    expect(rates.pipelineOutput).toBeCloseTo(1200 * .8 / 105);
  });
});
