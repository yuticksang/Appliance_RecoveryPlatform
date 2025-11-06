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
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'profile', loadComponent: () => import('./components/clientSide/profile/profile').then(m => m.ProfileComponent) },
      { path: 'questionnaire', loadComponent: () => import('./components/clientSide/questionnaire/step2/step2').then(m => m.Step2Component) }

    ]
  },

  // if you ever want auth pages WITHOUT header/footer, put them here instead:
  // { path: 'auth', children: [ ...login/register routes... ] },

  { path: '**', redirectTo: '' }
];