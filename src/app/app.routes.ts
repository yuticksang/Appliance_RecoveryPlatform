import { Routes } from '@angular/router';
import { ClientLayoutComponent } from './shared/sellerLayout/seller-layout';
import { Layout } from './shared/adminLayout/layout';
import { AdminListComponent } from './components/adminSide/adminList/admin-list';
import { BuyerListComponent } from './components/adminSide/buyerList/buyer-list';
import { authGuard, superAdminGuard, adminGuard } from '../auth/auth.guard';
import { sellerGuard, guestGuard } from '../auth/seller.guard';

export const routes: Routes = [
  {
    path: '',
    component: ClientLayoutComponent, // header+footer live here
    children: [
      { path: 'home', loadComponent: () => import('./components/clientSide/home/home').then(m => m.HomeComponent) },
      { path: 'profile', canActivate: [sellerGuard], loadComponent: () => import('./components/clientSide/profile/profile').then(m => m.ProfileComponent) },
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
      {
        path: 'buyers',
        component: BuyerListComponent,
        canActivate: [superAdminGuard] // Only superadmin can access
      },

      // Routes accessible by both admin and superadmin
      {
        path: 'sellers',
        loadComponent: () => import('./components/adminSide/sellerList/seller-list').then(m => m.SellerListComponent).catch(() => {
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
           {
             path: '',
             loadComponent: () => import('./components/adminSide/appliance/appliance-list').then(m => m.ApplianceListComponent)
           },
          //   {
          //     path: 'price-list',
          //     loadComponent: () => import('./components/adminSide/priceList/price-list').then(m => m.PriceListComponent)
          //   },
          //   {
          //     path: 'category',
          //     loadComponent: () => import('./components/adminSide/category/category').then(m => m.CategoryComponent)
          //   },
          //   {
          //     path: 'brand',
          //     loadComponent: () => import('./components/adminSide/brand/brand').then(m => m.BrandComponent)
          //   },
          //   {
          //     path: 'condition',
          //     loadComponent: () => import('./components/adminSide/appliances/condition/condition').then(m => m.ConditionComponent)
          //   },
          //   {
          //     path: 'markdown-list',
          //     loadComponent: () => import('./components/adminSide/appliances/markdownList/markdown-list').then(m => m.MarkdownListComponent)
          //   },
            {
              path: 'scoring',
              loadComponent: () => import('./components/adminSide/scoring-configuration/scoring-configuration').then(m => m.ScoringConfiguration)
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
      { path: '', redirectTo: 'sellers', pathMatch: 'full' } // Default redirect to sellers
    ]
  },

  // Auth pages WITHOUT any layout
  { path: 'admin-login', canActivate: [guestGuard], loadComponent: () => import('./components/adminSide/login/admin-login').then(m => m.AdminLoginComponent) },
  { path: 'buyer-login', canActivate: [guestGuard], loadComponent: () => import('./components/buyerSide/login/buyer-login').then(m => m.BuyerLoginComponent) },

  { path: '**', redirectTo: '' }
];