import { Routes } from '@angular/router';
import { GENERATOR_TABS, PLANNER_TAB, WORKSHOP_TABS } from './create/calculator-tabs';
import { ArmCalculatorComponent } from './calculator/arm-calculator/arm-calculator.component';
import { BeltCalculatorComponent } from './calculator/belt-calculator/belt-calculator.component';
import { CrafterCalculatorComponent } from './calculator/crafter-calculator/crafter-calculator.component';
import { CrushingCalculatorComponent } from './calculator/crushing-calculator/crushing-calculator.component';
import { DeployerCalculatorComponent } from './calculator/deployer-calculator/deployer-calculator.component';
import { DrillCalculatorComponent } from './calculator/drill-calculator/drill-calculator.component';
import { FanCalculatorComponent } from './calculator/fan-calculator/fan-calculator.component';
import { MillstoneCalculatorComponent } from './calculator/millstone-calculator/millstone-calculator.component';
import { MixerCalculatorComponent } from './calculator/mixer-calculator/mixer-calculator.component';
import { PressCalculatorComponent } from './calculator/press-calculator/press-calculator.component';
import { PumpCalculatorComponent } from './calculator/pump-calculator/pump-calculator.component';
import { SawCalculatorComponent } from './calculator/saw-calculator/saw-calculator.component';

const workshop = () => import('./create/workshop.component').then(module => module.WorkshopComponent);
const generatorCalculator = () => import('./create/generator-calculator.component').then(module => module.GeneratorCalculatorComponent);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: PLANNER_TAB.id },
  { path: PLANNER_TAB.id, loadComponent: () => import('./planner/planner.component').then(module => module.PlannerComponent) },
  { path: 'generators', pathMatch: 'full', redirectTo: GENERATOR_TABS[0].id },
  ...GENERATOR_TABS.map(({ id, generator }) => ({
    path: id, loadComponent: generatorCalculator, data: { generator },
  })),
  ...WORKSHOP_TABS.map(({ id }) => ({ path: id, loadComponent: workshop, data: { tool: id } })),
  {
    path: 'drill',
    component: DrillCalculatorComponent
  },
  {
    path: 'mixer',
    component: MixerCalculatorComponent
  },
  {
    path: 'fan',
    component: FanCalculatorComponent
  },
  {
    path: 'press',
    component: PressCalculatorComponent
  },
  {
    path: 'millstone',
    component: MillstoneCalculatorComponent
  },
  {
    path: 'crushing',
    component: CrushingCalculatorComponent
  },
  {
    path: 'belt',
    component: BeltCalculatorComponent
  },
  {
    path: 'saw',
    component: SawCalculatorComponent
  },
  {
    path: "deployer",
    component: DeployerCalculatorComponent
  },
  {
    path: "arm",
    component: ArmCalculatorComponent
  },
  {
    path: "crafter",
    component: CrafterCalculatorComponent
  },
  {
    path: "pump",
    component: PumpCalculatorComponent
  },
  {
    path: '**',
    redirectTo: 'drill'
  }
];
