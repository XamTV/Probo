import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login').then((m) => m.Login),
  },
  {
    // US-02 — where an invitation link lands. Public: its holder has no
    // account to sign in with yet, the token is what identifies them.
    path: 'invitation/:token',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/accept-invitation').then((m) => m.AcceptInvitation),
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () => import('./users/user-list').then((m) => m.UserList),
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
