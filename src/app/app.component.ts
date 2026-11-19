import { Component, inject } from '@angular/core';
import { ActivationStart, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { CalculatorService } from './calculator/calculator.service';
import { TooltipDirective } from './tooltip';
import { PLANNER_TAB } from './create/calculator-tabs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, TooltipDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly plannerId = PLANNER_TAB.id;
  private readonly calculatorService = inject(CalculatorService);
  private readonly router = inject(Router);

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof ActivationStart) {
        const id = event.snapshot.url[0]?.path;
        if (id && this.calculatorService.getCalculator(id)) {
          this.calculatorService.setSelectedCalculator(id);
        }
      }
    });
  }

  get calculator() {
    return this.calculatorService.getSelectedCalculator();
  }
}
