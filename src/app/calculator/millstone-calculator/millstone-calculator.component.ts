import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { InputSideComponent } from "../shared/input-side/input-side.component";
import { NumberComponent } from "../shared/number/number.component";
import { OutputSideComponent } from "../shared/output-side/output-side.component";
import { EnumComponent } from "../shared/enum/enum.component";
import { g_millstoneRecipes } from '../constants';
import { NuenumComponent } from "../shared/nuenum/nuenum.component";
import { MillstoneCalculator, Result } from './millstone.calculator';

@Component({
  selector: 'app-millstone-calculator',
  standalone: true,
  imports: [InputSideComponent, NumberComponent, OutputSideComponent, EnumComponent, NuenumComponent],
  templateUrl: './millstone-calculator.component.html',
  styleUrl: './millstone-calculator.component.css'
})
export class MillstoneCalculatorComponent {
  stressRatio: number = 4;
  val_rpm: number = 256;
  in_recipeDuration: number = 0;
  val_time: number = 0;
  val_speed: number = 0;
  val_stress: number = 0;
  private cdRef = inject(ChangeDetectorRef);

  ngOnInit() { this.calculateFromRpm(); }

  get recipesKeys(): string[] {
    return Array.from(g_millstoneRecipes.keys());
  }
  get recipesValues(): number[] {
    return Array.from(g_millstoneRecipes.values());
  }

  get recipeInputHint(): string {
    return "Presets are from the Create 6.0.10 recipe data. Choose custom to enter a datapack recipe duration.";
  }
  get recipeDurationHint(): string {
    return "Enter the processing_time from the recipe JSON.";
  }

  calculateFromRpm() {
    this.updateValues(MillstoneCalculator.calculateFromRpm(this.val_rpm, this.in_recipeDuration));
  }

  calculateFromSpeed() {
    this.updateValues(MillstoneCalculator.calculateFromSpeed(this.val_speed, this.in_recipeDuration));
  }

  calculateFromTime() {
    this.updateValues(MillstoneCalculator.calculateFromTime(this.val_time, this.in_recipeDuration));
  }
  
  calculateFromStress() {
    this.val_rpm = this.val_stress / this.stressRatio;
    this.calculateFromRpm();
  }

  updateValues(result: Result) {
    this.cdRef.detectChanges(); // update DOM with values given by user ( change detector is blind :( )
    this.val_rpm = result.rpm;
    this.val_time = result.time;
    this.val_speed = result.speed;
    this.val_stress = result.rpm * this.stressRatio;
  }

}
