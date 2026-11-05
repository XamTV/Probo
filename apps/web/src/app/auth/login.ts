import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LoginInput, type Locale } from '@probo/shared';

import { LocaleService } from '../i18n/locale.service';
import { SessionService } from './session.service';

/** US-01 — the sign-in screen. Its specification is Connexion.dc.html. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TranslocoDirective, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly localeService = inject(LocaleService);

  protected readonly locale = this.localeService.locale;
  protected readonly locales = this.localeService.available;

  protected readonly submitting = signal(false);

  /**
   * One message for every failure, as US-01 requires.
   *
   * The API already refuses to say whether an address exists; repeating its
   * distinction here would reopen the oracle it closes.
   */
  protected readonly failed = signal(false);
  protected readonly unavailable = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected switchLocale(locale: Locale): void {
    this.localeService.set(locale);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.failed.set(false);
    this.unavailable.set(false);

    // The same schema guards the API, so what the browser accepts is what the
    // server accepts — and the rule is written once.
    const parsed = LoginInput.safeParse(this.form.getRawValue());
    if (!parsed.success) {
      this.failed.set(true);
      this.submitting.set(false);
      return;
    }

    try {
      await this.session.signIn(parsed.data);
      // US-01 — return to where the visitor was heading before the session
      // sent them here.
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next ?? '/ranking');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.failed.set(true);
      } else {
        this.unavailable.set(true);
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
