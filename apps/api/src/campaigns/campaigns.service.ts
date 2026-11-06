import { BadRequestException, Injectable } from '@nestjs/common';
import {
  type ActivationBlocker,
  type CreateCampaignInput,
  DEFAULT_SCORE_WEIGHTING,
  type DocumentType,
  type ReferenceTextInput,
  type SessionUser,
  type UpdateCampaignInput,
  activationBlockers,
} from '@probo/shared';
import { AuditService } from '../audit/audit.service';
import { orNotFound, scopedWhere } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';

/** What a caller sees of a campaign. */
const VISIBLE = {
  id: true,
  name: true,
  description: true,
  status: true,
  expectedTypes: true,
  confidenceThreshold: true,
  relevanceWeight: true,
  clarityWeight: true,
  formalQualityWeight: true,
  opensAt: true,
  closesAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const REFERENCE_VISIBLE = {
  id: true,
  documentType: true,
  text: true,
  fileName: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** US-04, US-05, US-06, US-22 — a campaign and the references it compares to. */
@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(caller: SessionUser) {
    return this.prisma.campaign.findMany({
      where: scopedWhere(caller, {}),
      select: VISIBLE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * One campaign, with its references and what still blocks its activation.
   *
   * The blockers travel with the campaign rather than behind a second call:
   * the configuration screen shows everything left to do at once, instead of
   * revealing it one save at a time.
   */
  async findOne(caller: SessionUser, id: string) {
    const campaign = orNotFound(
      await this.prisma.campaign.findFirst({
        where: scopedWhere(caller, { id }),
        select: { ...VISIBLE, referenceProfiles: { select: REFERENCE_VISIBLE } },
      }),
    );

    return { ...campaign, activationBlockers: this.blockersOf(campaign) };
  }

  /** US-04 — a campaign is born a draft, and a draft accepts no import. */
  async create(caller: SessionUser, input: CreateCampaignInput) {
    const created = await this.prisma.campaign.create({
      data: {
        institutionId: caller.institutionId,
        name: input.name,
        description: input.description ?? null,
        opensAt: input.opensAt ?? null,
        closesAt: input.closesAt ?? null,
        // Expected types stay empty on purpose: US-05 asks for at least one,
        // and activation is where that is enforced. Guessing a default here
        // would configure the campaign on the institution's behalf.
        expectedTypes: [],
        relevanceWeight: DEFAULT_SCORE_WEIGHTING.relevance,
        clarityWeight: DEFAULT_SCORE_WEIGHTING.clarity,
        formalQualityWeight: DEFAULT_SCORE_WEIGHTING.formalQuality,
      },
      select: VISIBLE,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'CAMPAIGN_CREATED',
      entityType: 'CAMPAIGN',
      entityId: created.id,
      details: { name: created.name },
    });

    return created;
  }

  /** US-05, US-06 — the analysis settings, saved one section at a time. */
  async update(caller: SessionUser, id: string, input: UpdateCampaignInput) {
    const existing = await this.findOne(caller, id);

    const updated = await this.prisma.campaign.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        description: input.description,
        expectedTypes: input.expectedTypes,
        confidenceThreshold: input.confidenceThreshold,
        relevanceWeight: input.weighting?.relevance,
        clarityWeight: input.weighting?.clarity,
        formalQualityWeight: input.weighting?.formalQuality,
        opensAt: input.opensAt,
        closesAt: input.closesAt,
      },
      select: { ...VISIBLE, referenceProfiles: { select: REFERENCE_VISIBLE } },
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'CAMPAIGN_UPDATED',
      entityType: 'CAMPAIGN',
      entityId: id,
      details: input,
    });

    // US-06 — changing these settings leaves analyses already produced alone.
    // Nothing recomputes here, and that is the behaviour, not an omission.
    return { ...updated, activationBlockers: this.blockersOf(updated) };
  }

  /**
   * US-22, RG-08 — one reference per expected document type, and one only.
   *
   * Written as an upsert on `(campaignId, documentType)`, which is the unique
   * key the schema carries: replacing a reference is the same act as creating
   * one, and a second reference for the same type cannot exist.
   */
  async saveReference(caller: SessionUser, campaignId: string, input: ReferenceTextInput) {
    const campaign = await this.findOne(caller, campaignId);

    // The two forms are exclusive. The union has already refused a payload
    // carrying both; this is what writes the absence of the other form, so
    // replacing a described profile by a document leaves no remnant of it.
    // Writing the absence of the other form matters: replacing an uploaded
    // document by a described profile has to clear the file columns, or the
    // row would carry both forms and the CHECK constraint would refuse it.
    const form = { text: input.text, fileName: null, storageKey: null, extractedText: null };

    const saved = await this.prisma.referenceProfile.upsert({
      where: {
        campaignId_documentType: { campaignId: campaign.id, documentType: input.documentType },
      },
      create: { campaignId: campaign.id, documentType: input.documentType, ...form },
      update: form,
      select: REFERENCE_VISIBLE,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'REFERENCE_PROFILE_UPDATED',
      entityType: 'REFERENCE_PROFILE',
      entityId: saved.id,
      details: { campaignId: campaign.id, documentType: input.documentType, form: input.form },
    });

    return saved;
  }

  /**
   * US-04, RG-08 — activation, refused while anything is missing.
   *
   * The check is the same pure function the screen uses to preview it, so the
   * two cannot disagree about what "ready" means.
   */
  async activate(caller: SessionUser, id: string) {
    const campaign = await this.findOne(caller, id);
    const blockers = campaign.activationBlockers;

    if (blockers.length > 0) {
      throw new BadRequestException({ message: 'CAMPAIGN_NOT_READY', blockers });
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'ACTIVE' },
      select: VISIBLE,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'CAMPAIGN_UPDATED',
      entityType: 'CAMPAIGN',
      entityId: id,
      details: { status: 'ACTIVE' },
    });

    return updated;
  }

  /**
   * Feeds the stored row to the shared rule.
   *
   * The three weights are flat columns in the database and one object in the
   * contract; this is the single place that bridges the two, so the rule never
   * learns the shape of a table.
   */
  private blockersOf(campaign: {
    expectedTypes: DocumentType[];
    relevanceWeight: number;
    clarityWeight: number;
    formalQualityWeight: number;
    opensAt: Date | null;
    closesAt: Date | null;
    referenceProfiles?: { documentType: DocumentType }[];
  }): ActivationBlocker[] {
    return activationBlockers({
      expectedTypes: campaign.expectedTypes,
      profiledTypes: (campaign.referenceProfiles ?? []).map((p) => p.documentType),
      weighting: {
        relevance: campaign.relevanceWeight,
        clarity: campaign.clarityWeight,
        formalQuality: campaign.formalQualityWeight,
      },
      opensAt: campaign.opensAt,
      closesAt: campaign.closesAt,
    });
  }
}
