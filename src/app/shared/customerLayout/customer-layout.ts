import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ClientHeaderComponent } from './header';
import { ClientFooterComponent } from './footer';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, ClientHeaderComponent, ClientFooterComponent],
  templateUrl: './customer-layout.html'
})
export class ClientLayoutComponent {}
