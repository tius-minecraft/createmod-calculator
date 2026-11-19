import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { g_calculatorsData } from '../calculator/constants';
import { FACTORY_TABS, iconPath } from '../create/tool-icons';
import { TooltipDirective } from '../tooltip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TooltipDirective],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  readonly factoryTabs = FACTORY_TABS;
  readonly iconPath = iconPath;
  get calculatorsData() {
    return g_calculatorsData;
  }
}
