import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TAB_GROUPS } from '../create/calculator-tabs';
import { TooltipDirective } from '../tooltip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TooltipDirective],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  readonly groups = TAB_GROUPS;

  revealActive(list: HTMLElement, tab: HTMLElement) {
    const viewport = list.getBoundingClientRect();
    const item = tab.getBoundingClientRect();
    if (item.left < viewport.left) {
      list.scrollLeft += item.left - viewport.left;
    } else if (item.right > viewport.right) {
      list.scrollLeft += item.right - viewport.right;
    }
  }
}
