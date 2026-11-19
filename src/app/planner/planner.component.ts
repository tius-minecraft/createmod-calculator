import { Component, OnInit } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DEFAULT_MAX_RPM, GENERATORS } from '../create/kinetics';
import { itemName, loadCatalog, MACHINES, materialUnit, RecipeCatalog, recipeName } from '../create/recipes';
import { buildPlan, Plan, PlanStage, PlannerSettings, Goal, selectRecipe } from './production-plan';

const STORAGE_KEY = 'create-6.0.10.factory';
const EXAMPLES = [
  { item: 'create:precision_mechanism', rate: 60 },
  { item: 'create:brass_ingot', rate: 120 },
  { item: 'create:sturdy_sheet', rate: 60 },
  { item: 'create:track', rate: 120 },
];

@Component({
  standalone: true,
  imports: [FormsModule, DecimalPipe, PercentPipe, RouterLink],
  templateUrl: './planner.component.html',
})
export class PlannerComponent implements OnInit {
  readonly itemName = itemName;
  readonly recipeName = recipeName;
  readonly unit = materialUnit;
  readonly Infinity = Number.POSITIVE_INFINITY;
  readonly machines = MACHINES;
  readonly examples = EXAMPLES;
  readonly generatorTypes = GENERATORS;
  settings = this.restore();
  catalog?: RecipeCatalog;
  plan?: Plan;
  error = '';
  search = '';
  finding = false;
  selectedStage = '';
  showSettings = false;
  showProducts = false;
  generator = 'large';

  ngOnInit() {
    this.load();
  }

  async load() {
    this.error = '';
    try {
      this.catalog = await loadCatalog();
      this.update();
    } catch {
      this.error = 'Could not load the recipe catalog.';
    }
  }

  get searchResults() {
    const query = this.search.trim().toLowerCase();
    if (!query) return [];
    return this.catalog?.items.filter(item => itemName(item).toLowerCase().includes(query) || item.includes(query))
      .sort((a, b) => Number(itemName(b).toLowerCase().startsWith(query)) - Number(itemName(a).toLowerCase().startsWith(query)))
      .slice(0, 12) ?? [];
  }

  get visibleStage() {
    return this.plan?.stages.find(stage => stage.item === this.selectedStage);
  }

  get lanes() {
    const lanes = new Map<number, PlanStage[]>();
    for (const stage of this.plan?.stages ?? []) {
      if (!lanes.has(stage.depth)) lanes.set(stage.depth, []);
      lanes.get(stage.depth)!.push(stage);
    }
    return [...lanes];
  }

  get equipmentSummary() {
    const totals = new Map<string, number>();
    for (const stage of this.plan?.stages ?? []) {
      for (const machine of stage.equipment) {
        const label = machine.machine === 'crushing' ? 'Crushing Wheel' : this.machines[machine.machine].label;
        const blocks = machine.blocks * (machine.machine === 'crushing' ? 2 : 1);
        if (blocks) totals.set(label, (totals.get(label) ?? 0) + blocks);
      }
      if (stage.support) totals.set('Blaze Burner', (totals.get('Blaze Burner') ?? 0) + stage.support);
    }
    return [...totals].sort(([a], [b]) => a.localeCompare(b));
  }

  shiftFlow(flow: HTMLElement, direction: number) {
    flow.scrollBy({ left: direction * Math.max(190, flow.clientWidth * .8), behavior: 'auto' });
  }

  get generatorCount() {
    const source = this.generatorTypes.find(source => source.id === this.generator);
    return Math.ceil((this.plan?.stress ?? 0) / (source?.su || 1));
  }

  view(item: string, scroll = false) {
    this.selectedStage = this.selectedStage === item && !scroll ? '' : item;
    if (this.selectedStage) requestAnimationFrame(() => document.getElementById('stage-details')?.scrollIntoView({ block: 'nearest' }));
  }

  addGoal(item: string, rate = 60) {
    const current = this.settings.goals.find(goal => goal.item === item);
    if (!current) this.settings.goals.push({ item, rate });
    this.search = '';
    this.finding = false;
    this.update();
  }

  useExample(goal: Goal) {
    this.settings.goals = [{ ...goal }];
    this.selectedStage = '';
    this.update();
  }

  removeGoal(item: string) {
    this.settings.goals = this.settings.goals.filter(goal => goal.item !== item);
    this.update();
  }

  setRate(goal: Goal, rate: number | null) {
    goal.rate = this.bounded(rate, 0, 1_000_000);
    this.update();
  }

  setMachineSetting(key: 'rpm' | 'beltRpm' | 'batch', value: number | null) {
    this.settings[key] = Math.trunc(this.bounded(value, key === 'batch' ? 1 : 0, key === 'batch' ? 64 : DEFAULT_MAX_RPM));
    this.update();
  }

  setRecipe(item: string, value: string) {
    if (value === 'auto') delete this.settings.recipes[item];
    else this.settings.recipes[item] = value;
    this.update();
  }

  setIngredient(key: string, value: string) {
    this.settings.ingredients[key] = value;
    this.update();
  }

  setLimit(key: string, value: number | null) {
    if (value === null) delete this.settings.limits[key];
    else this.settings.limits[key] = Math.trunc(this.bounded(value, 0, 1_000_000));
    this.update();
  }

  recipeSelection(item: string) {
    if (!this.catalog) return '';
    return selectRecipe(item, this.catalog, this.settings)?.id ?? '';
  }

  alternatives(item: string) {
    return this.catalog?.producers(item) ?? [];
  }

  exportCsv() {
    if (!this.plan) return;
    const rows = [['Type', 'Material', 'Unit', 'Per minute', 'Recipe or machine', 'Machine units', 'Stress (SU)']];
    for (const section of this.plan.stages) {
      const material = section.item;
      rows.push(['Production', material, this.unit(material), String(section.rate), section.recipe.id, '', '']);
      for (const input of section.input) {
        rows.push(['Ingredient', input.item, this.unit(input.item), String(input.rate), section.recipe.id, '', '']);
      }
      for (const machine of section.equipment) {
        rows.push(['Equipment', material, '', '', this.machines[machine.machine].label,
          String(machine.installed), String(machine.stress)]);
      }
    }
    for (const material of this.plan.external) {
      rows.push(['External input', material.item, this.unit(material.item), String(material.rate), '', '', '']);
    }
    for (const material of this.plan.byproducts) {
      rows.push(['Byproduct', material.item, this.unit(material.item), String(material.rate), '', '', '']);
    }
    const csv = rows.map(row => row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'create-factory-plan.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private update() {
    if (this.catalog) {
      this.plan = buildPlan(this.catalog, this.settings);
      if (this.selectedStage && !this.visibleStage && !this.plan.external.some(input => input.item === this.selectedStage)) {
        this.selectedStage = '';
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // The planner also works for browsers with storage disabled.
    }
  }

  private restore(): PlannerSettings {
    const defaults: PlannerSettings = {
      goals: [{ ...EXAMPLES[0] }], rpm: 256, beltRpm: 128, batch: 16, recipes: {}, ingredients: {}, limits: {},
    };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as PlannerSettings | null;
      if (saved && Array.isArray(saved.goals)) return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
    return defaults;
  }

  private bounded(value: number | null, min: number, max: number) {
    return Math.max(min, Math.min(max, typeof value === 'number' && Number.isFinite(value) ? value : min));
  }
}
