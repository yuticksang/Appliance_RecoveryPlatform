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
      { path: 'home', loadComponent: () => import('./components/clientSide/home/home').then(m => m.HomeComponent) },
      { path: 'profile', canActivate: [customerGuard], loadComponent: () => import('./components/clientSide/profile/profile').then(m => m.ProfileComponent) },
      { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/login/auth-login').then(m => m.AuthLoginComponent) },
      { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/register/auth-register').then(m => m.AuthRegisterComponent) },
      { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/forgot/forgot').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password/:token', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/reset/reset').then(m => m.ResetPasswordComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
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
       {
         path: 'appliances',
          children: [
          //  {
          //    path: '',
          //    loadComponent: () => import('./components/adminSide/applianceList/appliance-list').then(m => m.ApplianceListComponent).catch(() => {
          //      return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
          //    })
          //  },
          //   {
          //     path: 'price-list',
          //     loadComponent: () => import('./components/adminSide/appliances/priceList/price-list').then(m => m.PriceListComponent).catch(() => {
          //       return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
          //     })
          //   },
          //   {
          //     path: 'category',
          //     loadComponent: () => import('./components/adminSide/appliances/category/category').then(m => m.CategoryComponent).catch(() => {
          //       return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
          //     })
          //   },
          //   {
          //     path: 'brand',
          //     loadComponent: () => import('./components/adminSide/appliances/brand/brand').then(m => m.BrandComponent).catch(() => {
          //       return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
          //     })
          //   },
          //   {
          //     path: 'condition',
          //     loadComponent: () => import('./components/adminSide/appliances/condition/condition').then(m => m.ConditionComponent).catch(() => {
          //       return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
          //     })
          //   },
          //   {
          //     path: 'markdown-list',
          //     loadComponent: () => import('./components/adminSide/appliances/markdownList/markdown-list').then(m => m.MarkdownListComponent).catch(() => {
          //       return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
          //     })
          //   },
            {
              path: 'scoringConfiguration',
              loadComponent: () => import('./components/adminSide/scoring-configuration/scoring-configuration').then(m => m.ScoringConfiguration).catch(() => {
                return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
              })
            }
          ] 
        },
      // {
      //   path: 'reporting',
      //   loadComponent: () => import('./components/adminSide/reporting/reporting').then(m => m.ReportingComponent).catch(() => {
      //     // Placeholder if not exists
      //     return import('./components/adminSide/adminList/admin-list').then(m => m.AdminListComponent);
      //   })
      // },
      {
         path: 'dashboard',
         loadComponent: () => import('./components/adminSide/dashboard/dashboard').then(m => m.Dashboard)
         
       },
      { path: '', redirectTo: 'customers', pathMatch: 'full' } // Default redirect to customers
    ]
  },

  // Auth pages WITHOUT any layout
  { path: 'admin-login', loadComponent: () => import('./components/adminSide/login/admin-login').then(m => m.AdminLoginComponent) },
  { path: 'buyer-login', loadComponent: () => import('./components/buyerSide/login/buyer-login').then(m => m.BuyerLoginComponent) },

  { path: '**', redirectTo: '' }
];