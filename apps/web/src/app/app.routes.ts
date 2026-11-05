import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login').then((m) => m.Login),
  },
  {
    path: 'campaigns',
    canActivate: [authGuard],
    loadComponent: () => import('./campaigns/campaign-list').then((m) => m.CampaignList),
  },
  {
    path: 'campaigns/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./campaigns/campaign-settings').then((m) => m.CampaignSettings),
  },
  {
    path: 'ranking',
    canActivate: [authGuard],
    loadComponent: () => import('./ranking/ranking').then((m) => m.Ranking),
  },
  { path: '', pathMatch: 'full', redirectTo: 'ranking' },
  { path: '**', redirectTo: 'ranking' },
];
