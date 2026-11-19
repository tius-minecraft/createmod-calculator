import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivationStart, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { CalculatorService } from './calculator/calculator.service';
import { TooltipDirective } from './tooltip';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FormsModule, TooltipDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  isWorkshop = false;
  switchTabAnimation: boolean = false;
  private calculatorService = inject(CalculatorService);
  private router = inject(Router);

  ngOnInit() {
    this.router.events.subscribe((val) => {
      if(val instanceof ActivationStart) {
        const id = val.snapshot.url[0]?.path;
        if (!id) return;
        this.isWorkshop = !this.calculatorService.getCalculator(id);
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
