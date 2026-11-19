import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { ItemIconComponent, loadItemAtlas, type ItemAtlas } from '../planner/item-icon.component';
import { readPlannerSettings, savePlannerSettings, setFarmSetting } from '../planner/planner-settings';
import type { FarmSettings } from '../planner/production-plan';
import { FARM_RECIPES } from './farm-recipes';
import { OPERATIONS_PER_MINUTE } from './kinetics';
import { expectedYield, itemName, MACHINES, type Recipe } from './recipes';
import { BLOCK_GENERATORS, generatorCollection, generatorTicks, resourceSourceId } from './resource-sources';
import { PonderSceneComponent } from './ponder-scene.component';

const SOURCE_GROUPS = [
  { label: 'Block generators', recipes: BLOCK_GENERATORS },
  { label: 'Crops', recipes: FARM_RECIPES.filter(recipe => recipe.farm?.scene !== 'tree') },
  { label: 'Trees', recipes: FARM_RECIPES.filter(recipe => recipe.farm?.scene === 'tree') },
];

@Component({
  standalone: true,
  imports: [DecimalPipe, PercentPipe, FormsModule, RouterLink, RouterLinkActive, ItemIconComponent, PonderSceneComponent],
  templateUrl: './resource-sources.component.html',
  styleUrl: './resource-sources.component.css',
})
export class ResourceSourcesComponent {
  readonly groups = SOURCE_GROUPS;
  readonly itemName = itemName;
  readonly sourceId = resourceSourceId;
  readonly collection = generatorCollection;
  readonly settings = readPlannerSettings();
  atlas?: ItemAtlas;
  source?: Recipe;
  group = SOURCE_GROUPS[0];
  rpm = this.settings.rpm;

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(params => {
      const id = params.get('source');
      this.group = this.groups.find(group => group.recipes.some(recipe => resourceSourceId(recipe) === id)) ?? this.groups[0];
      this.source = this.group.recipes.find(recipe => resourceSourceId(recipe) === id);
    });
    void loadItemAtlas().then(atlas => this.atlas = atlas).catch(() => undefined);
  }

  get farmSettings() {
    return this.source ? this.settings.farms?.[this.source.id] : undefined;
  }

  get harvestYield() {
    const source = this.source!;
    return this.farmSettings?.yield ?? expectedYield(source, source.outputs[0].item);
  }

  get harvestMinutes() {
    return this.farmSettings?.minutes ?? this.source!.farm!.minutes;
  }

  get generatorRate() {
    return OPERATIONS_PER_MINUTE / generatorTicks(this.source!.generator!, this.rpm);
  }

  get drillStress() {
    return this.rpm * MACHINES.drill.stress;
  }

  get equipment(): string[] {
    const source = this.source!;
    if (source.farm) return [...source.farm.equipment, source.farm.planting, source.farm.soil];
    if (!source.generator) return [];
    const { material, ground } = source.generator;
    return ['create:mechanical_drill', 'minecraft:lava_bucket', material,
      ...(ground ? [ground, 'create:chute', 'create:encased_fan'] : ['create:belt_connector'])];
  }

  setRpm(value: number | null) {
    this.rpm = Math.max(0, Math.min(256, Math.trunc(value ?? 0)));
  }

  setFarmRate(key: keyof FarmSettings, value: number | null) {
    if (!this.source) return;
    setFarmSetting(this.settings, this.source.id, key, value);
    savePlannerSettings(this.settings);
  }
}
