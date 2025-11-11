import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService } from '../../../auth/auth-service';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: '0', overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: '1' }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: '1', overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: '0', opacity: '0' }))
      ])
    ])
  ]
})
export class Layout {
  isDropdownOpen = false;
  isSidebarCollapsed = false;
  isSidebarHovered = false;
  isSidebarLocked = false; 
  private toggleLock = false;

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  toggleSidebar() {
     
    if (this.isSidebarCollapsed) {
      // First click, expand and lock it
      this.isSidebarCollapsed = false;
      this.isSidebarLocked = true;
      this.isSidebarHovered = false;
    } else if (this.isSidebarLocked) {
      // Second click, if locked, unlock and collapse
      this.isSidebarLocked = false;
      this.isSidebarCollapsed = true;
      this.isDropdownOpen = false;
    } else {
      // If expanded but not locked (from hover), collapse it
      this.isSidebarCollapsed = true;
      this.isSidebarHovered = false;
      this.isDropdownOpen = false;
    }

   this.toggleLock = true;
    setTimeout(() => {
      this.toggleLock = false;
    }, 300);
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onAppliancesMouseEnter() {
    this.isDropdownOpen = true;
  }

   onAppliancesMouseLeave() {
    this.isDropdownOpen = false;
  }

  onSideBarMouseEnter() {
    if (this.isSidebarCollapsed && !this.toggleLock && !this.isSidebarLocked) {
      this.isSidebarHovered = true;
    }  
  }

  onSideBarMouseLeave() {
   if (this.isSidebarCollapsed && !this.toggleLock && !this.isSidebarLocked) {
      this.isSidebarHovered = false;
      this.isDropdownOpen = false;
    }
      
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/admin-login']);
  }

  isAppliancesActive(): boolean {
    return this.router.url.startsWith('/admin/appliances');
  }
}
