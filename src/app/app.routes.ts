import { Routes } from '@angular/router';
import { ClientLayoutComponent } from './shared/clientLayout/client-layout';

export const routes: Routes = [
  {
    path: '',
    component: ClientLayoutComponent, // header+footer live here
    children: [
      { path: 'dashboard', loadComponent: () => import('./components/clientSide/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'login', loadComponent: () => import('./components/clientSide/login/auth-login').then(m => m.AuthLoginComponent) },
      { path: 'register', loadComponent: () => import('./components/clientSide/register/auth-register').then(m => m.AuthRegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./components/clientSide/forgot/forgot').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password/:token', loadComponent: () => import('./components/clientSide/reset/reset').then(m => m.ResetPasswordComponent) },
      { path: 'profile', loadComponent: () => import('./components/clientSide/profile/profile').then(m => m.ProfileComponent) },
      { path: 'transactions', loadComponent: () => import('./components/clientSide/transactions/transactions').then(m => m.TransactionsComponent) },
      { path: 'transactions/:id', loadComponent: () => import('./components/clientSide/transaction-detail/transaction-detail').then(m => m.TransactionDetailComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // if you ever want auth pages WITHOUT header/footer, put them here instead:
  // { path: 'auth', children: [ ...login/register routes... ] },

  { path: '**', redirectTo: '' }
];