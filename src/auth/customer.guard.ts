import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../app/services/auth.service';

/**
 * Customer guard - protects routes that require a logged-in customer
 * Redirects to login if not authenticated
 */
export const customerGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Check token and user directly from localStorage for immediate synchronous response
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    // Not logged in - redirect to login
    console.log('❌ Customer guard: Not logged in, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  try {
    const user = JSON.parse(userStr);

    // Check if user is a customer
    if (user.userType !== 'customer') {
      console.log('❌ Customer guard: Not a customer, redirecting to login');
      router.navigate(['/login']);
      return false;
    }

    console.log('✅ Customer guard: Access granted');
    return true;
  } catch (e) {
    console.error('❌ Customer guard: Failed to parse user data', e);
    router.navigate(['/login']);
    return false;
  }
};

/**
 * Guest guard - prevents logged-in users from accessing login/register pages
 * Redirects to appropriate dashboard if already logged in
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Check token and user directly from localStorage for immediate synchronous response
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);

      // Already logged in - redirect based on user type
      console.log('✅ Guest guard: Already logged in, redirecting to dashboard');

      // Redirect based on user type
      if (user.userType === 'admin' || user.userType === 'superadmin') {
        router.navigate(['/admin']);
      } else if (user.userType === 'customer') {
        router.navigate(['/home']);
      } else {
        router.navigate(['/home']);
      }

      return false;
    } catch (e) {
      console.error('❌ Guest guard: Failed to parse user data', e);
    }
  }

  console.log('✅ Guest guard: Not logged in, access granted');
  return true;
};
