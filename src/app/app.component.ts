import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivationStart, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { CalculatorService } from './calculator/calculator.service';
import { TooltipDirective } from './tooltip';
import { FACTORY_TABS, iconPath } from './create/tool-icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FormsModule, TooltipDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  isWorkshop = false;
  switchTabAnimation = false;
  workshopIcon?: string;
  private calculatorService = inject(CalculatorService);
  private router = inject(Router);

  ngOnInit() {
    this.router.events.subscribe((val) => {
      if(val instanceof ActivationStart) {
        const id = val.snapshot.url[0]?.path;
        if (!id) return;
        const factoryTool = FACTORY_TABS.find(tool => tool.id === id);
        this.isWorkshop = factoryTool !== undefined;
        this.workshopIcon = factoryTool && iconPath(factoryTool.icon);
        if (!this.isWorkshop) {
          this.calculatorService.setSelectedCalculator(id);
          this.onCalculatorChanged();
        }
      }
    })
  }

  get calculator() {
    return this.calculatorService.getSelectedCalculator();
  }

  onCalculatorChanged() {
    this.switchTabAnimation = true;
  }

  onAnimationend() {
    this.switchTabAnimation = false;
  }
}
