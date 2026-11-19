import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { decimal } from '../calculator/constants';
import { InfoComponent } from '../calculator/shared/info/info.component';
import { InputSideComponent } from '../calculator/shared/input-side/input-side.component';
import { NumberComponent } from '../calculator/shared/number/number.component';
import { OutputSideComponent } from '../calculator/shared/output-side/output-side.component';
import { DEFAULT_MAX_RPM, GENERATORS, steamPower, windmillPower, type Power } from './kinetics';

@Component({
  standalone: true,
  imports: [FormsModule, InfoComponent, InputSideComponent, NumberComponent, OutputSideComponent],
  templateUrl: './generator-calculator.component.html',
})
export class GeneratorCalculatorComponent {
  readonly generator = inject(ActivatedRoute).snapshot.data['generator'] as typeof GENERATORS[number];
  readonly decimal = decimal;
  readonly maxRpm = DEFAULT_MAX_RPM;

  sails = 32;
  tanks = 16;
  heat = 4;
  water = 40;
  engines = 4;
  passive = false;
  motorRpm = DEFAULT_MAX_RPM;

  get power(): Power {
    switch (this.generator.id) {
      case 'windmill': return windmillPower(this.sails);
      case 'steam': return steamPower(this.tanks, this.heat, this.water, this.engines, this.passive);
      case 'creative': return { rpm: this.motorRpm, su: this.motorRpm * this.generator.su / this.generator.rpm };
      default: return this.generator;
    }
  }
}
