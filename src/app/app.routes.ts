import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth-login').then(m => m.AuthLoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth-register').then(m => m.AuthRegisterComponent) },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
