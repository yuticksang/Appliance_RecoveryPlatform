import { Routes } from '@angular/router';
import { ClientLayoutComponent } from './shared/customerLayout/customer-layout';
import { Layout } from './shared/adminLayout/layout';
import { AdminListComponent } from './components/adminSide/adminList/admin-list';
import { authGuard, superAdminGuard, adminGuard } from '../auth/auth.guard';
import { customerGuard, guestGuard } from '../auth/customer.guard';

export const routes: Routes = [
  {
    path: '',
    component: ClientLayoutComponent, // header+footer live here
    children: [
      { path: 'dashboard', loadComponent: () => import('./components/clientSide/home/home').then(m => m.HomeComponent) },
      { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/login/auth-login').then(m => m.AuthLoginComponent) },
      { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/register/auth-register').then(m => m.AuthRegisterComponent) },
      { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/forgot/forgot').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password/:token', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/reset/reset').then(m => m.ResetPasswordComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'profile', canActivate: [customerGuard], loadComponent: () => import('./components/clientSide/profile/profile').then(m => m.ProfileComponent) }
    ]
  },

  // Admin pages WITH admin layout (sidebar, etc.)
  {
    path: 'admin',
    component: Layout,
    canActivate: [adminGuard], // Protect entire admin section
    children: [
      // Superadmin only routes
      {
        path: 'admins',
        component: AdminListComponent,
        canActivate: [superAdminGuard] // Only superadmin can access
      },
      // {
      //   path: 'buyers',
      //   loadComponent: () => import('./components/adminSide/buyerList/buyer-list').then(m => m.BuyerListComponent).catch(() => {
      //     // If component doesn't exist yet, show a placeholder
      //     return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
      //   }),
      //   canActivate: [superAdminGuard] // Only superadmin can access
      // },

      // Routes accessible by both admin and superadmin
      {
        path: 'customers',
        loadComponent: () => import('./components/adminSide/customerList/customer-list').then(m => m.CustomerListComponent).catch(() => {
          // Placeholder if not exists
          return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
        })
      },
      // {
      //   path: 'transactions',
      //   loadComponent: () => import('./components/adminSide/transactionList/transaction-list').then(m => m.TransactionListComponent).catch(() => {
      //     // Placeholder if not exists
      //     return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
      //   })
      // },
      // {
      //   path: 'appliances',
      //   loadComponent: () => import('./components/adminSide/applianceList/appliance-list').then(m => m.ApplianceListComponent).catch(() => {
      //     // Placeholder if not exists
      //     return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
      //   })
      // },
      // {
      //   path: 'reporting',
      //   loadComponent: () => import('./components/adminSide/reporting/reporting').then(m => m.ReportingComponent).catch(() => {
      //     // Placeholder if not exists
      //     return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
      //   })
      // },
      // {
      //   path: 'dashboard',
      //   loadComponent: () => import('./components/adminSide/dashboard/dashboard').then(m => m.DashboardComponent).catch(() => {
      //     // Redirect to customers if dashboard doesn't exist
      //     return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
      //   })
      // },
      { path: '', redirectTo: 'customers', pathMatch: 'full' } // Default redirect to customers
    ]
  },

  // Auth pages WITHOUT any layout
  { path: 'admin-login', loadComponent: () => import('./components/adminSide/login/admin-login').then(m => m.AdminLoginComponent) },
  { path: 'buyer/login', loadComponent: () => import('./components/buyerSide/login/buyer-login').then(m => m.BuyerLoginComponent) },

  { path: '**', redirectTo: '' }
];