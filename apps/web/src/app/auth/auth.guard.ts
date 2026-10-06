import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/**
 * US-01 — an expired session returns to the sign-in screen **without losing
 * the requested URL**.
 *
 * The destination travels as a query parameter rather than in a service, so it
 * survives the full page reload that an expired session often causes.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.isSettled()) await session.restore();
  if (session.isSignedIn()) return true;

  return router.createUrlTree(['/connexion'], {
    queryParams: state.url === '/' ? {} : { suite: state.url },
  });
};

/** Keeps a signed-in user away from the sign-in screen. */
export const guestGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.isSettled()) await session.restore();
  return session.isSignedIn() ? router.createUrlTree(['/classement']) : true;
};
