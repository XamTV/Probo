import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { LoginInput, SessionUser } from '@probo/shared';
import { firstValueFrom } from 'rxjs';

/**
 * The signed-in user, as the whole front end sees them.
 *
 * The session token is never held here: it lives in an httpOnly cookie the
 * browser attaches on its own, and the page's JavaScript cannot read it. This
 * service only knows **who** is signed in, never **how** the proof travels —
 * which is what makes a cross-site scripting flaw unable to steal a session.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);

  private readonly current = signal<SessionUser | null>(null);
  private readonly settled = signal(false);

  readonly user = this.current.asReadonly();
  readonly isSignedIn = computed(() => this.current() !== null);

  /** False until the first `/auth/me` has answered, success or failure. */
  readonly isSettled = this.settled.asReadonly();

  /**
   * Restores the session on a page load.
   *
   * The cookie survives a reload, so the front end asks the API who it is
   * rather than storing anything itself. A 401 is the expected answer for a
   * visitor, not an error worth surfacing.
   */
  async restore(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<SessionUser>('/api/auth/me'));
      this.current.set(user);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        // Anything other than "not signed in" is worth knowing about.
        console.error('Session restore failed', error);
      }
      this.current.set(null);
    } finally {
      this.settled.set(true);
    }
  }

  async signIn(input: LoginInput): Promise<void> {
    const user = await firstValueFrom(this.http.post<SessionUser>('/api/auth/login', input));
    this.current.set(user);
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/auth/logout', {}));
    this.current.set(null);
  }

  /** Called by the interceptor when the API says the session is gone. */
  clear(): void {
    this.current.set(null);
  }
}
