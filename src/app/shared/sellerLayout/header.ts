import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class ClientHeaderComponent {
  private router = inject(Router);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);

  menuOpen = false;

  // Use real auth service
  user = computed(() => {
    const profile = this.authService.userProfile();
    if (!profile) return null;
    return { username: profile.username };
  });

  logout() {
    this.authService.logout();
    this.menuOpen = false;
    this.alertService.success('Logged out successfully!');
  }

}
