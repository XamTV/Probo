import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CAMPAIGN_NAME_MAX_LENGTH } from '@probo/shared';
import { TranslocoDirective } from '@jsverse/transloco';

import { SessionService } from '../auth/session.service';
import { CampaignsService, type CampaignView } from './campaigns.service';

/**
 * US-04 — the campaigns of the institution, and the form that adds one.
 *
 * Creation asks for the little that identifies a campaign. Everything the
 * analysis needs is configured on the settings screen, because a campaign
 * cannot be activated before all of it exists anyway (RG-08) — so there is
 * nothing to gain by demanding it up front.
 */
@Component({
  selector: 'app-campaign-list',
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  templateUrl: './campaign-list.html',
})
export class CampaignList {
  private readonly campaigns = inject(CampaignsService);
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(SessionService);

  protected readonly items = signal<CampaignView[] | null>(null);
  protected readonly creating = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly failed = signal(false);

  /** Only an administrator configures a campaign; an officer reads it. */
  protected readonly canWrite = computed(() => this.session.user()?.role === 'ADMIN');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(CAMPAIGN_NAME_MAX_LENGTH)]],
    description: [''],
  });

  constructor() {
    void this.reload();
  }

  private async reload(): Promise<void> {
    this.items.set(await this.campaigns.list());
  }

  protected open(): void {
    this.failed.set(false);
    this.form.reset();
    this.formOpen.set(true);
  }

  protected close(): void {
    this.formOpen.set(false);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.creating()) return;

    this.creating.set(true);
    this.failed.set(false);
    try {
      const { name, description } = this.form.getRawValue();
      await this.campaigns.create({
        name,
        description: description.trim() === '' ? undefined : description,
      });
      this.formOpen.set(false);
      await this.reload();
    } catch {
      this.failed.set(true);
    } finally {
      this.creating.set(false);
    }
  }
}
