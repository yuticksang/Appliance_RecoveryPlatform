// src/app/auth/auth.service.ts
import { Injectable, signal } from '@angular/core';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';
export interface AuthUser {
  id: number;
  email: string;
  username: string;
  userType: 'admin' | 'customer' | 'buyer' | 'superadmin';
  adminRole?: AdminRole | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<AuthUser | null>(null);

  constructor() {
    // Restore user from localStorage on page refresh
    this.restoreUserFromStorage();
  }

  private restoreUserFromStorage() {
    // Use admin-specific storage keys
    const token = localStorage.getItem('admin_token');
    const userJson = localStorage.getItem('admin_user');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);

        // ONLY restore admin/superadmin users
        if (user.userType === 'admin' || user.userType === 'superadmin') {
          this.user.set(user);
          console.log('✅ Admin user restored from localStorage:', user);
        } else {
          console.log('ℹ️ Non-admin user found in admin storage, clearing');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
      } catch (error) {
        console.error('❌ Failed to restore admin user from localStorage:', error);
        // Clear invalid data
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
  }

  setUser(user: AuthUser | null) {
    // ONLY set admin/superadmin users in admin auth service
    // Customer auth service should manage customer users separately
    if (user && (user.userType === 'admin' || user.userType === 'superadmin')) {
      this.user.set(user);
      // Use admin-specific storage keys
      localStorage.setItem('admin_user', JSON.stringify(user));
      console.log('✅ Admin user set in admin auth service:', user.username);
    } else if (!user) {
      // Allow clearing user (for logout)
      this.user.set(null);
    } else {
      // Non-admin user, don't set in admin auth service
      console.log('ℹ️ Non-admin user, not setting in admin auth service');
    }
  }

  clearUser() {
    this.user.set(null);
    // Clear admin-specific storage only
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  isAdmin() { return this.user()?.userType === 'admin'; }
  isSuperAdmin() {
    return this.user()?.userType === 'superadmin' || this.user()?.adminRole === 'SUPER_ADMIN';
  }
  get role(): AdminRole | null { return (this.user()?.adminRole ?? null) as AdminRole | null; }
}
