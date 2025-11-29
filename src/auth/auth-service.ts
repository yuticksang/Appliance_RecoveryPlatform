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
    // Determine which user type to restore based on current URL/context
    const currentPath = window.location.pathname;
    const isAdminPath = currentPath.startsWith('/admin');
    const isBuyerPath = currentPath.startsWith('/buyer');

    // Try to restore admin user only if on admin path
    if (isAdminPath || !isBuyerPath) {
      const adminToken = localStorage.getItem('admin_token');
      const adminUserJson = localStorage.getItem('admin_user');

      if (adminToken && adminUserJson) {
        try {
          const user = JSON.parse(adminUserJson);

          // ONLY restore admin/superadmin users
          if (user.userType === 'admin' || user.userType === 'superadmin') {
            this.user.set(user);
            console.log('✅ Admin user restored from localStorage');
            return;
          } else {
            // Invalid admin user data, clear it
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
          }
        } catch (error) {
          console.error('❌ Failed to restore admin user:', error);
          // Clear invalid data
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
      }
    }

    // Try to restore buyer user only if on buyer path
    if (isBuyerPath || !isAdminPath) {
      const buyerToken = localStorage.getItem('buyer_token');
      const buyerUserJson = localStorage.getItem('buyer_user');

      if (buyerToken && buyerUserJson) {
        try {
          const user = JSON.parse(buyerUserJson);

          // ONLY restore buyer users
          if (user.userType === 'buyer') {
            this.user.set(user);
            console.log('✅ Buyer user restored from localStorage');
            return;
          } else {
            // Invalid buyer user data, clear it
            localStorage.removeItem('buyer_token');
            localStorage.removeItem('buyer_user');
          }
        } catch (error) {
          console.error('❌ Failed to restore buyer user:', error);
          // Clear invalid data
          localStorage.removeItem('buyer_token');
          localStorage.removeItem('buyer_user');
        }
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
    // Clear both admin and buyer storage
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('buyer_token');
    localStorage.removeItem('buyer_user');
  }

  isAdmin() { return this.user()?.userType === 'admin'; }
  isSuperAdmin() {
    return this.user()?.userType === 'superadmin' || this.user()?.adminRole === 'SUPER_ADMIN';
  }
  get role(): AdminRole | null { return (this.user()?.adminRole ?? null) as AdminRole | null; }
}
