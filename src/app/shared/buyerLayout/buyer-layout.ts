import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../auth/auth-service';

@Component({
  selector: 'app-buyer-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './buyer-layout.html',
  styleUrls: ['./buyer-layout.scss']
})
export class BuyerLayout {
  isDropdownOpen = false;
  isSidebarCollapsed = false;
  isSidebarHovered = false;
  isSidebarLocked = false;
  private toggleLock = false;
  isDropdownAnimated = true;

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {
    this.router.events.subscribe(() => {
      if(this.isAppliancesActive()) {
        this.isDropdownOpen = true;
      } else {
        this.isDropdownOpen = false;
      }
    })
  }

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
      if (!this.isAppliancesActive()) {
        this.isDropdownOpen = false;
      }
    } else {
      // If expanded but not locked (from hover), collapse it
      this.isSidebarCollapsed = true;
      this.isSidebarHovered = false;
      this.isDropdownOpen = false;

      if (!this.isAppliancesActive()) {
        this.isDropdownOpen = false;
      }
    }

    this.toggleLock = true;
    setTimeout(() => {
      this.toggleLock = false;
    }, 300);
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isDropdownAnimated = true;
  }

  onAppliancesMouseEnter() {
    this.isDropdownOpen = true;
  }

  onAppliancesMouseLeave() {
    if (!this.isAppliancesActive()) {
      this.isDropdownOpen = false;
    }
  }

  onSideBarMouseEnter() {
    if (this.isSidebarCollapsed && !this.toggleLock && !this.isSidebarLocked) {
      this.isSidebarHovered = true;

      if (this.isAppliancesActive()) {
        this.isDropdownOpen = true;
        this.isDropdownAnimated = false;
      }
    }
  }

  onSideBarMouseLeave() {
    if (this.isSidebarCollapsed && !this.toggleLock && !this.isSidebarLocked) {
      if (!this.isAppliancesActive() || this.isDropdownOpen) {
        this.isSidebarHovered = false;
        this.isDropdownAnimated = false;
        this.isDropdownOpen = false;
      }

      this.isSidebarHovered = false;
      this.isDropdownOpen = false;
    }
  }

  logout() {
    // Clear buyer auth service state
    this.auth.clearUser();
    this.router.navigate(['/buyer-login']);
  }

  isAppliancesActive(): boolean {
    return this.router.url.startsWith('/buyer/appliances');
  }
}
