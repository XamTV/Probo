import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CreateUserInput } from '@probo/shared';
import { TranslocoDirective } from '@jsverse/transloco';

import { SessionService } from '../auth/session.service';
import { UsersService, type AccountView } from './users.service';

/**
 * US-02 — the team's accounts. Its specification is Comptes.dc.html.
 *
 * Creating an account produces a link, shown once and copied by hand: Probo
 * sends no email, and the administrator must never know the password their
 * colleague will choose — otherwise the audit trail stops proving who acted.
 */
@Component({
  selector: 'app-user-list',
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  templateUrl: './user-list.html',
})
export class UserList {
  private readonly users = inject(UsersService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder);

  protected readonly items = signal<AccountView[] | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly failed = signal<'EMAIL_ALREADY_USED' | 'UNAVAILABLE' | null>(null);

  /** The link just issued, and the account it belongs to. Shown once. */
  protected readonly issued = signal<{ id: string; link: string } | null>(null);
  protected readonly copied = signal(false);

  protected readonly canWrite = computed(() => this.session.user()?.role === 'ADMIN');
  protected readonly me = computed(() => this.session.user()?.id ?? null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    role: ['ADMISSIONS_OFFICER' as const, Validators.required],
  });

  constructor() {
    void this.reload();
  }

  private async reload(): Promise<void> {
    this.items.set(await this.users.list());
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.creating()) {
      this.form.markAllAsTouched();
      return;
    }

    const parsed = CreateUserInput.safeParse(this.form.getRawValue());
    if (!parsed.success) {
      this.form.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.failed.set(null);
    try {
      const account = await this.users.create(parsed.data);
      this.show(account.id, account.invitationToken);
      this.form.reset({ email: '', name: '', role: 'ADMISSIONS_OFFICER' });
      this.formOpen.set(false);
      await this.reload();
    } catch (error) {
      this.failed.set(this.reason(error));
    } finally {
      this.creating.set(false);
    }
  }

  /** US-02 — a fresh link; the previous one stops working at that instant. */
  protected async reissue(account: AccountView): Promise<void> {
    this.failed.set(null);
    try {
      const invitation = await this.users.invite(account.id);
      this.show(account.id, invitation.invitationToken);
      await this.reload();
    } catch (error) {
      this.failed.set(this.reason(error));
    }
  }

  protected async setActive(account: AccountView, isActive: boolean): Promise<void> {
    this.failed.set(null);
    try {
      await this.users.update(account.id, { isActive });
      await this.reload();
    } catch (error) {
      this.failed.set(this.reason(error));
    }
  }

  protected async copy(): Promise<void> {
    const current = this.issued();
    if (current === null) return;

    try {
      await navigator.clipboard.writeText(current.link);
      this.copied.set(true);
    } catch {
      // Clipboard access can be refused. The link is on screen and
      // selectable, so there is nothing to recover from.
      this.copied.set(false);
    }
  }

  private show(id: string, token: string): void {
    this.issued.set({ id, link: this.users.invitationLink(token) });
    this.copied.set(false);
  }

  private reason(error: unknown): 'EMAIL_ALREADY_USED' | 'UNAVAILABLE' {
    const status = (error as { status?: number }).status;
    return status === 409 ? 'EMAIL_ALREADY_USED' : 'UNAVAILABLE';
  }
}
