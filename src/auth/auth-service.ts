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
    // Don't auto-restore on refresh - let the customer auth service handle validation
    // This prevents showing cached user data before token validation completes
  }

  setUser(user: AuthUser | null) {
    this.user.set(user);
  }

  clearUser() {
    this.user.set(null);
  }

  isAdmin() { return this.user()?.userType === 'admin'; }
  isSuperAdmin() {
    return this.user()?.userType === 'superadmin' || this.user()?.adminRole === 'SUPER_ADMIN';
  }
  get role(): AdminRole | null { return (this.user()?.adminRole ?? null) as AdminRole | null; }
}
