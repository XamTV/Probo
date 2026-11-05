import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { SessionService } from '../auth/session.service';

/**
 * Placeholder for the ranking screen (M-09, lot 6).
 *
 * It exists so lot 1 has somewhere to land after signing in, and so the guard
 * and the session restore can be exercised end to end. Its real content comes
 * with its own lot; nothing here is meant to survive.
 */
@Component({
  selector: 'app-ranking',
  imports: [RouterLink, TranslocoDirective],
  template: `
    <main
      class="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6"
      *transloco="let t"
    >
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">{{ t('app.name') }}</h1>
      @if (session.user(); as user) {
        <p class="text-slate-600">{{ user.name }} — {{ t('userRole.' + user.role) }}</p>
      }
      <div class="flex items-center gap-3">
        <a routerLink="/campaigns" class="text-sm text-[#294B8A] hover:underline">
          {{ t('campaign.title') }}
        </a>
        <button
          type="button"
          (click)="signOut()"
          class="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-slate-500"
        >
          {{ t('auth.signOut') }}
        </button>
      </div>
    </main>
  `,
})
export class Ranking {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected async signOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/login']);
  }
}
