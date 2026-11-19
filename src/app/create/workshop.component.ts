import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { decimal } from '../calculator/constants';
import { EnumComponent } from '../calculator/shared/enum/enum.component';
import { InfoComponent } from '../calculator/shared/info/info.component';
import { InputSideComponent } from '../calculator/shared/input-side/input-side.component';
import { NumberComponent } from '../calculator/shared/number/number.component';
import { OutputSideComponent } from '../calculator/shared/output-side/output-side.component';
import {
  CREATE_SOURCE, DEFAULT_MAX_RPM, DRAIN_TICKS, funnelTicks, PACKAGER_MODES, packagerPayload, SPOUT_TICKS, TICKS_PER_SECOND,
} from './kinetics';
import { itemName, loadCatalog, MACHINES, materialUnit, Recipe, sequenceRates } from './recipes';
import { MACHINE_ICONS, iconPath } from './tool-icons';

@Component({
  standalone: true,
  imports: [
    FormsModule, DecimalPipe, PercentPipe, EnumComponent, InfoComponent, InputSideComponent, NumberComponent, OutputSideComponent,
  ],
  templateUrl: './workshop.component.html',
})
export class WorkshopComponent implements OnInit {
  readonly tool = inject(ActivatedRoute).snapshot.data['tool'] as string;
  readonly source = CREATE_SOURCE;
  readonly decimal = decimal;
  readonly machineIcons = MACHINE_ICONS;
  readonly iconPath = iconPath;
  readonly modeLabels = PACKAGER_MODES.map(mode => mode.label);
  readonly machines = MACHINES;
  readonly itemName = itemName;
  readonly unit = materialUnit;
  readonly ticksPerSecond = TICKS_PER_SECOND;
  readonly maxRpm = DEFAULT_MAX_RPM;
  readonly spoutTicks = SPOUT_TICKS;
  readonly drainTicks = DRAIN_TICKS;
  readonly Infinity = Number.POSITIVE_INFINITY;

  mode = 0;
  slots = 9;
  stack = 64;
  bulky = false;
  tps = 20;
  requested = 60;
  fluidAmount = 250;
  supply = 0;
  extractionTimer = 8;
  rpm = DEFAULT_MAX_RPM;
  beltRpm = 128;
  sequences: Recipe[] = [];
  sequenceLabels: string[] = [];
  sequenceIndex = 0;
  error = false;

  async ngOnInit() {
    if (this.tool !== 'sequence') return;
    try {
      this.sequences = (await loadCatalog()).sequences;
      this.sequenceLabels = this.sequences.map(recipe => itemName(recipe.outputs[0].item));
      this.sequenceIndex = Math.max(0, this.sequences.findIndex(recipe => recipe.outputs[0].item === 'create:precision_mechanism'));
    } catch {
      this.error = true;
    }
  }

  get packagerCycle() {
    return (PACKAGER_MODES[this.mode] ?? PACKAGER_MODES[0]).ticks;
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

  get sequence() {
    return this.sequences[this.sequenceIndex] ?? this.sequences[0];
  }

  get sequenceResult() {
    return this.sequence ? sequenceRates(this.sequence, { rpm: this.rpm, beltRpm: this.beltRpm, batch: 1 }) : undefined;
  }

  rate(ticks: number) {
    return this.tps * 60 / ticks;
  }
}
