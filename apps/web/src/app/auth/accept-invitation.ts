import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AcceptInvitationInput, PASSWORD_MIN_LENGTH } from '@probo/shared';
import { firstValueFrom } from 'rxjs';

/**
 * US-02 — where an invitation link leads: the owner chooses their password.
 *
 * No session is opened here. Once the password is set they sign in like
 * everyone else, which keeps one way into the product rather than two.
 */
@Component({
  selector: 'app-accept-invitation',
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  templateUrl: './accept-invitation.html',
})
export class AcceptInvitation {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly submitting = signal(false);

  /**
   * One message for every refusal, as the API gives: an unknown link, a spent
   * one and an expired one are indistinguishable from here. Telling them apart
   * would say whether a token ever existed.
   */
  protected readonly refused = signal(false);
  protected readonly unavailable = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const parsed = AcceptInvitationInput.safeParse({
      token: this.route.snapshot.paramMap.get('token') ?? '',
      password: this.form.getRawValue().password,
    });
    if (!parsed.success) {
      this.refused.set(true);
      return;
    }

    this.submitting.set(true);
    this.refused.set(false);
    this.unavailable.set(false);

    try {
      await firstValueFrom(this.http.post('/api/auth/invitation', parsed.data));
      await this.router.navigate(['/login'], { queryParams: { invited: 1 } });
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 400)) {
        this.refused.set(true);
      } else {
        this.unavailable.set(true);
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
