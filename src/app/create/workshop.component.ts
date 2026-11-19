import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CREATE_SOURCE, DRAIN_TICKS, funnelTicks, GENERATORS, OPERATIONS_PER_MINUTE, PACKAGER_MODES,
  packagerPayload, SPOUT_TICKS, steamPower, TICKS_PER_SECOND, windmillPower,
} from './kinetics';
import { GENERATOR_ICONS, MACHINE_ICONS, iconPath } from './tool-icons';
import { itemName, loadCatalog, MACHINES, materialUnit, Recipe, sequenceRates } from './recipes';

@Component({
  standalone: true,
  imports: [FormsModule, DecimalPipe, PercentPipe, RouterLink],
  templateUrl: './workshop.component.html',
})
export class WorkshopComponent implements OnInit {
  readonly tool = inject(ActivatedRoute).snapshot.data['tool'] as string;
  readonly source = CREATE_SOURCE;
  readonly generators = GENERATORS;
  readonly generatorIcons = GENERATOR_ICONS;
  readonly machineIcons = MACHINE_ICONS;
  readonly iconPath = iconPath;
  readonly packagerModes = PACKAGER_MODES;
  readonly machines = MACHINES;
  readonly itemName = itemName;
  readonly unit = materialUnit;
  readonly ticksPerSecond = TICKS_PER_SECOND;
  readonly spoutTicks = SPOUT_TICKS;
  readonly drainTicks = DRAIN_TICKS;
  readonly Infinity = Number.POSITIVE_INFINITY;
  mode: typeof PACKAGER_MODES[number]['id'] = 'queued';
  slots = 9;
  stack = 64;
  bulky = false;
  tps = 20;
  requested = 60;
  fluidAmount = 250;
  supply = 0;
  extractionTimer = 8;
  rpm = 256;
  beltRpm = 128;
  sails = 32;
  tanks = 16;
  heat = 4;
  water = 40;
  engines = 4;
  passive = false;
  motorRpm = 256;
  sequences: Recipe[] = [];
  selectedSequence = 'create:sequenced_assembly/precision_mechanism';
  error = false;

  async ngOnInit() {
    if (this.tool !== 'sequence') return;
    try {
      this.sequences = (await loadCatalog()).sequences;
    } catch {
      this.error = true;
    }
  }

  get packagerCycle() {
    return this.packagerModes.find(mode => mode.id === this.mode)!.ticks;
  }

  get packageRate() {
    return this.tps * 60 / this.packagerCycle;
  }

  get packagePayload() {
    return packagerPayload(this.slots, this.stack, this.bulky);
  }

  get spoutRate() {
    const rate = this.tps * 60 / SPOUT_TICKS;
    return this.supply > 0 ? Math.min(rate, this.supply * 60 / this.fluidAmount) : rate;
  }

  get spoutsRequired() {
    return Math.ceil(this.requested / this.spoutRate);
  }

  get funnelCycle() {
    return funnelTicks(this.extractionTimer);
  }

  get windmill() {
    return windmillPower(this.sails);
  }

  get steam() {
    return steamPower(this.tanks, this.heat, this.water, this.engines, this.passive);
  }

  get sequence() {
    return this.sequences.find(recipe => recipe.id === this.selectedSequence);
  }

  get sequenceResult() {
    return this.sequence ? sequenceRates(this.sequence, { rpm: this.rpm, beltRpm: this.beltRpm, batch: 1 }) : undefined;
  }

  numeric(value: number | null, low: number, high: number): number {
    return Math.max(low, Math.min(high, typeof value === 'number' && Number.isFinite(value) ? value : low));
  }

  rate(ticks: number) {
    return operationsPerMinuteAt(ticks, this.tps);
  }
}

function operationsPerMinuteAt(ticks: number, tps: number) {
  return OPERATIONS_PER_MINUTE * tps / (TICKS_PER_SECOND * ticks);
}
