import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session.service';

/**
 * Turns an expired session into a return to the sign-in screen.
 *
 * Without it, a session that expires mid-use shows an error on every screen
 * instead of asking the user to sign in again. The requested URL is carried
 * over, as US-01 asks.
 *
 * `/auth/me` is exempt: a 401 there is the normal answer for a visitor, and
 * redirecting on it would loop.
 */
export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      const expired =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.endsWith('/auth/me') &&
        !request.url.endsWith('/auth/login');

      if (expired) {
        session.clear();
        const suite = router.url;
        void router.navigate(['/connexion'], {
          queryParams: suite === '/' ? {} : { suite },
        });
      }
      return throwError(() => error);
    }),
  );
};
