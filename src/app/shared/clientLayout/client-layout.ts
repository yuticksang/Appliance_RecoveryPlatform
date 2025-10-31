import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ClientHeaderComponent } from './header';
import { ClientFooterComponent } from './footer';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, ClientHeaderComponent, ClientFooterComponent],
  template: `
    <app-header></app-header>
    <main class="page"><router-outlet /></main>
    <app-footer></app-footer>
  `
})
export class ClientLayoutComponent {}
