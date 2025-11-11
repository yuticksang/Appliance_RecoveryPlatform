import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth-service';

/**
 * Auth guard to check if user is logged in
 * Redirects to appropriate login page if not authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();

  if (!user) {
    // Not logged in - redirect to admin login
    router.navigate(['/admin-login']);
    return false;
  }

  return true;
};

/**
 * Superadmin guard - only allows superadmin users
 * Regular admins will be redirected
 */
export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();

  // Check if user is logged in
  if (!user) {
    router.navigate(['/admin-login']);
    return false;
  }

  // Check if user is superadmin
  if (!authService.isSuperAdmin()) {
    // Not a superadmin - redirect to dashboard or show error
    // Since dashboard doesn't exist yet, redirect to sellers or another allowed page
    router.navigate(['/admin/sellers']);
    return false;
  }

  return true;
};

/**
 * Admin or Superadmin guard - allows both admin and superadmin users
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();

  if (!user) {
    router.navigate(['/admin-login']);
    return false;
  }

  // Check if user is admin or superadmin
  const isAdminUser = user.userType === 'admin' || user.userType === 'superadmin';

  if (!isAdminUser) {
    // Not an admin - redirect to seller home
    router.navigate(['/home']);
    return false;
  }

  return true;
};
