import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  type ExpectedDocumentType,
  REFERENCE_TEXT_MIN_LENGTH,
} from '@probo/shared';
import { TranslocoDirective } from '@jsverse/transloco';

import { SessionService } from '../auth/session.service';
import { CampaignsService, type CampaignDetail } from './campaigns.service';

/** US-05 — the four types an institution may ask for. OTHER is not one. */
const TYPES: ExpectedDocumentType[] = [
  'RESUME',
  'COVER_LETTER',
  'RECOMMENDATION_LETTER',
  'PORTFOLIO',
];

/**
 * US-05, US-06, US-22 — the settings of one campaign.
 *
 * Each section saves on its own, which is why the API takes a partial update:
 * ticking a document type should not make the screen resend a weighting the
 * user did not touch.
 *
 * What blocks activation is never computed here. It arrives with the campaign,
 * decided by the shared rule the API enforces with, so the banner and the
 * refusal cannot tell two different stories.
 */
@Component({
  selector: 'app-campaign-settings',
  imports: [FormsModule, RouterLink, TranslocoDirective],
  templateUrl: './campaign-settings.html',
})
export class CampaignSettings {
  private readonly campaigns = inject(CampaignsService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);

  protected readonly types = TYPES;
  protected readonly minLength = REFERENCE_TEXT_MIN_LENGTH;
  protected readonly defaultThreshold = DEFAULT_CONFIDENCE_THRESHOLD;

  protected readonly campaign = signal<CampaignDetail | null>(null);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  /** The type whose reference is being written, if any. */
  protected readonly editing = signal<ExpectedDocumentType | null>(null);
  protected readonly draft = signal('');

  protected readonly canWrite = computed(() => this.session.user()?.role === 'ADMIN');
  protected readonly blockers = computed(() => this.campaign()?.activationBlockers ?? []);
  protected readonly ready = computed(
    () => this.campaign() !== null && this.blockers().length === 0,
  );

  /**
   * The weights as the user will read them: normalised by their sum (RG-05).
   *
   * The sliders never constrain one another, so the only honest way to show
   * what a weight is worth is to show its share of the total.
   */
  protected readonly effective = computed(() => {
    const c = this.campaign();
    if (c === null) return null;
    const sum = c.relevanceWeight + c.clarityWeight + c.formalQualityWeight;
    if (sum <= 0) return null;
    const pct = (w: number): number => Math.round((w / sum) * 100);
    return {
      relevance: pct(c.relevanceWeight),
      clarity: pct(c.clarityWeight),
      formalQuality: pct(c.formalQualityWeight),
    };
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) void this.reload(id);
  }

  private async reload(id: string): Promise<void> {
    this.campaign.set(await this.campaigns.findOne(id));
  }

  protected referenceOf(type: ExpectedDocumentType) {
    return this.campaign()?.referenceProfiles.find((p) => p.documentType === type) ?? null;
  }

  protected isExpected(type: ExpectedDocumentType): boolean {
    return this.campaign()?.expectedTypes.includes(type) ?? false;
  }

  /** Ticking a type saves straight away: there is no draft state to lose. */
  protected async toggleType(type: ExpectedDocumentType): Promise<void> {
    const c = this.campaign();
    if (c === null || !this.canWrite()) return;

    const next = this.isExpected(type)
      ? c.expectedTypes.filter((t) => t !== type)
      : [...c.expectedTypes, type];

    // US-05 asks for at least one type. An empty list is refused by the API
    // too; refusing it here keeps the user from a pointless round trip.
    if (next.length === 0) return;

    await this.save({ expectedTypes: next });
  }

  protected async saveThreshold(value: number): Promise<void> {
    await this.save({ confidenceThreshold: Number(value) });
  }

  protected async saveWeighting(
    axis: 'relevance' | 'clarity' | 'formalQuality',
    value: number,
  ): Promise<void> {
    const c = this.campaign();
    if (c === null) return;

    const weighting = {
      relevance: c.relevanceWeight,
      clarity: c.clarityWeight,
      formalQuality: c.formalQualityWeight,
      [axis]: Number(value) / 100,
    };

    await this.save({ weighting });
  }

  protected startEditing(type: ExpectedDocumentType): void {
    this.draft.set(this.referenceOf(type)?.text ?? '');
    this.editing.set(type);
  }

  protected cancelEditing(): void {
    this.editing.set(null);
  }

  protected async saveReference(): Promise<void> {
    const c = this.campaign();
    const type = this.editing();
    if (c === null || type === null || this.saving()) return;

    this.saving.set(true);
    this.failed.set(false);
    try {
      await this.campaigns.saveReference(c.id, {
        form: 'TEXT',
        documentType: type,
        text: this.draft(),
      });
      this.editing.set(null);
      await this.reload(c.id);
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  protected async activate(): Promise<void> {
    const c = this.campaign();
    if (c === null || this.saving()) return;

    this.saving.set(true);
    this.failed.set(false);
    try {
      await this.campaigns.activate(c.id);
      await this.reload(c.id);
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private async save(input: Parameters<CampaignsService['update']>[1]): Promise<void> {
    const c = this.campaign();
    if (c === null || this.saving()) return;

    this.saving.set(true);
    this.failed.set(false);
    try {
      this.campaign.set(await this.campaigns.update(c.id, input));
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
