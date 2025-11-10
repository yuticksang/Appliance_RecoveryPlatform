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
 * Redirects to appropriate dashboard if already logged in (same user type only)
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Check which page they're trying to access
  const targetPath = state.url;
  const isCustomerLogin = targetPath.startsWith('/login') || targetPath.startsWith('/register');
  const isAdminLogin = targetPath.startsWith('/admin-login');
  const isBuyerLogin = targetPath.startsWith('/buyer-login');

  // Check admin session (admin-specific storage)
  if (isAdminLogin) {
    const adminToken = localStorage.getItem('admin_token');
    const adminUserStr = localStorage.getItem('admin_user');

    if (adminToken && adminUserStr) {
      try {
        const adminUser = JSON.parse(adminUserStr);
        if (adminUser.userType === 'admin' || adminUser.userType === 'superadmin') {
          console.log('✅ Guest guard: Admin already logged in, redirecting to admin');
          router.navigate(['/admin']);
          return false;
        }
      } catch (e) {
        console.error('❌ Guest guard: Failed to parse admin user data', e);
      }
    }
  }

  // Check customer session (customer-specific storage)
  if (isCustomerLogin) {
    const customerToken = localStorage.getItem('token');
    const customerUserStr = localStorage.getItem('user');

    if (customerToken && customerUserStr) {
      try {
        const customerUser = JSON.parse(customerUserStr);
        if (customerUser.userType === 'customer') {
          console.log('✅ Guest guard: Customer already logged in, redirecting to home');
          router.navigate(['/home']);
          return false;
        }
      } catch (e) {
        console.error('❌ Guest guard: Failed to parse customer user data', e);
      }
    }
  }

  // Check buyer session (could use buyer-specific storage in the future)
  if (isBuyerLogin) {
    const buyerToken = localStorage.getItem('buyer_token');
    const buyerUserStr = localStorage.getItem('buyer_user');

    if (buyerToken && buyerUserStr) {
      try {
        const buyerUser = JSON.parse(buyerUserStr);
        if (buyerUser.userType === 'buyer') {
          console.log('✅ Guest guard: Buyer already logged in, redirecting to buyer dashboard');
          router.navigate(['/buyer']);
          return false;
        }
      } catch (e) {
        console.error('❌ Guest guard: Failed to parse buyer user data', e);
      }
    }
  }

  console.log('✅ Guest guard: Not logged in for this user type, access granted');
  return true;
};
