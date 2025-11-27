import { Routes } from '@angular/router';
import { ClientLayoutComponent } from './shared/sellerLayout/seller-layout';
import { Layout } from './shared/adminLayout/layout';
import { BuyerLayout } from './shared/buyerLayout/buyer-layout';
import { AdminListComponent } from './components/adminSide/adminList/admin-list';
import { BuyerListComponent } from './components/adminSide/buyerList/buyer-list';
import { authGuard, superAdminGuard, adminGuard, buyerGuard } from '../auth/auth.guard';
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
      { path: 'verify-email/:token', canActivate: [guestGuard], loadComponent: () => import('./components/clientSide/verify-email/verify-email').then(m => m.VerifyEmailComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'questionnaire', canActivate: [sellerGuard], loadComponent: () => import('./components/clientSide/questionnaires/questionnaires').then(m => m.QuestionnairesComponent) },
      { path: 'recovery-slip/:id', canActivate: [sellerGuard], loadComponent: () => import('./components/clientSide/recovery-slip/recovery-slip').then(m => m.RecoverySlipComponent) },
      { path: 'packaging-instruction', canActivate: [sellerGuard], loadComponent: () => import('./components/clientSide/packaging-instruction/packaging-instruction').then(m => m.PackagingInstruction) },
      { path: 'transactions', canActivate: [sellerGuard], loadComponent: () => import('./components/clientSide/transactions/transactions').then(m => m.TransactionsComponent) },
      { path: 'transaction-detail/:id', canActivate: [sellerGuard], loadComponent: () => import('./components/clientSide/transaction-detail/transaction-detail').then(m => m.TransactionDetailComponent) }
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
      {
        path: 'transactions',
        loadComponent: () => import('./components/adminSide/SellersTransactionList/seller-transaction-list').then(m => m.SellerTransactionListComponent)
      },
      {
        path: 'transactions/:id',
        loadComponent: () => import('./components/adminSide/TransactionDetail/admin-transaction-detail').then(m => m.AdminTransactionDetailComponent)
      },
      {
        path: 'appliances',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/adminSide/appliance/appliance-list').then(m => m.ApplianceListComponent)
          },
          {
            path: 'price-list',
            loadComponent: () => import('./components/adminSide/priceList/price-list').then(m => m.PriceListComponent)
          },
          {
            path: 'category',
            loadComponent: () => import('./components/adminSide/categoryList/category-list').then(m => m.CategoryListComponent)
          },
          {
            path: 'brand',
            loadComponent: () => import('./components/adminSide/brandList/brand-list').then(m => m.BrandListComponent)
          },
          {
            path: 'scoring',
            loadComponent: () => import('./components/adminSide/scoring-configuration/scoring-configuration').then(m => m.ScoringConfiguration)
          },
          {
            path: 'condition',
            loadComponent: () => import('./components/adminSide/conditionList/condition-list').then(m => m.ConditionListComponent)
          },
          {
            path: 'markdown-list',
            loadComponent: () => import('./components/adminSide/markdownList/markdown-list').then(m => m.MarkdownListComponent)
          }
        ]
      },
      {
         path: 'dashboard',
         loadComponent: () => import('./components/adminSide/dashboard/dashboard').then(m => m.Dashboard)

       },
      { path: '', redirectTo: 'sellers', pathMatch: 'full' } // Default redirect to sellers
    ]
  },

  // Buyer pages WITH buyer layout (sidebar, etc.)
  {
    path: 'buyer',
    component: BuyerLayout,
    canActivate: [buyerGuard], // Protect entire buyer section
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/buyerSide/dashboard/buyer-dashboard').then(m => m.BuyerDashboardComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./components/buyerSide/dashboard/buyer-dashboard').then(m => m.BuyerDashboardComponent) // Placeholder
      },
      {
        path: 'appliances',
        children: [
          {
            path: '',
            loadComponent: () => import('./components/buyerSide/applianceList/buyer-appliance-list').then(m => m.BuyerApplianceListComponent)
          },
          {
            path: 'condition-markdown',
            loadComponent: () => import('./components/buyerSide/markdownList/buyer-markdown-list').then(m => m.BuyerMarkdownListComponent)
          }
        ]
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' } // Default redirect to dashboard
    ]
  },

  // Auth pages WITHOUT any layout
  { path: 'admin-login', canActivate: [guestGuard], loadComponent: () => import('./components/adminSide/login/admin-login').then(m => m.AdminLoginComponent) },
  { path: 'buyer-login', canActivate: [guestGuard], loadComponent: () => import('./components/buyerSide/login/buyer-login').then(m => m.BuyerLoginComponent) },

  { path: '**', redirectTo: '' }
];
