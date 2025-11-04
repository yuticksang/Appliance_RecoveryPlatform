import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../app/services/auth.service';

/**
 * Customer guard - protects routes that require a logged-in customer
 * Redirects to login if not authenticated
 */
export const customerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = authService.isLoggedIn();
  const user = authService.currentUser();

  if (!isLoggedIn || !user) {
    // Not logged in - redirect to login
    console.log('❌ Customer guard: Not logged in, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  // Check if user is a customer
  if (user.userType !== 'customer') {
    console.log('❌ Customer guard: Not a customer, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  console.log('✅ Customer guard: Access granted');
  return true;
};

/**
 * Guest guard - prevents logged-in users from accessing login/register pages
 * Redirects to dashboard if already logged in
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = authService.isLoggedIn();

  if (isLoggedIn) {
    // Already logged in - redirect to dashboard
    console.log('✅ Guest guard: Already logged in, redirecting to dashboard');
    router.navigate(['/dashboard']);
    return false;
  }

  console.log('✅ Guest guard: Not logged in, access granted');
  return true;
};
