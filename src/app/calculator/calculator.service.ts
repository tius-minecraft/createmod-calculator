import { Injectable } from "@angular/core";
import { CalculatorData } from "./calculator.model";
import { CALCULATOR_TABS } from "../create/calculator-tabs";

@Injectable({
  'providedIn': 'root'
})
export class CalculatorService {
  selectedCalculatorId: string = CALCULATOR_TABS[0].id;

  getCalculator(id: string): CalculatorData | undefined {
    return CALCULATOR_TABS.find((c) => c.id === id);
  }

  getSelectedCalculator(): CalculatorData {
    return this.getCalculator(this.selectedCalculatorId)!;
  }

  setSelectedCalculator(id: string) {
    this.selectedCalculatorId = id;
  }

  saveProperty(propertyName: string, value: number) {
    window.localStorage.setItem(this.getSelectedCalculator().id+"."+propertyName, value.toString());
  }

  getSavedProperty(propetyName: string): number | null {
    let val = window.localStorage.getItem(this.getSelectedCalculator().id+"."+propetyName);
    if(val === null)
      return null;
    return Number(val);
  }
}