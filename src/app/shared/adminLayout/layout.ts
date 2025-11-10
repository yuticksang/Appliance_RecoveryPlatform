import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../auth/auth-service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
export class Layout {
  constructor(
    public auth: AuthService,
    private router: Router
  ) {}

  logout() {
    // Clear admin auth service state (this clears admin_token and admin_user)
    this.auth.clearUser();

    this.router.navigate(['/admin-login']);
  }
}
