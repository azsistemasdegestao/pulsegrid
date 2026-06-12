import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./pages/admin/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin/leads',
    loadComponent: () => import('./pages/admin/admin-leads/admin-leads').then((m) => m.AdminLeads),
  },
];
