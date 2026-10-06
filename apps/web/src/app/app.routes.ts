import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/connexion').then((m) => m.Connexion),
  },
  {
    path: 'classement',
    canActivate: [authGuard],
    loadComponent: () => import('./classement/classement').then((m) => m.Classement),
  },
  { path: '', pathMatch: 'full', redirectTo: 'classement' },
  { path: '**', redirectTo: 'classement' },
];
