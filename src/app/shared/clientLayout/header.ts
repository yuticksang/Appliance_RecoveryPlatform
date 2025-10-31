import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AlertService } from '../../services/alert.service';

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

  menuOpen = false;

  // Mock user observable - replace with real auth service later
  user$ = new BehaviorSubject<{ username: string } | null>({ username: 'ChuaSY' });

  mockLogout() {
    this.user$.next(null);
    this.menuOpen = false;
    this.alertService.success('Logged out successfully!');
    this.router.navigate(['/login']);
  }

}
