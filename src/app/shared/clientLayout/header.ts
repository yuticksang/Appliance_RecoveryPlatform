import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router'; // ⬅️ add RouterLinkActive

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive], // ⬅️ include it here
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent {}
