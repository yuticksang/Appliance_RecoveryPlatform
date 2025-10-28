import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/clientLayout/header';
import { FooterComponent } from './shared/clientLayout/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent {}
