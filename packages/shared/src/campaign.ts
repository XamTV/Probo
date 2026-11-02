import { z } from 'zod';
import { ScoreWeighting } from './analysis.js';
import { DocumentType } from './enums.js';

/**
 * Campaign configuration and its comparison references — US-04, US-05, US-06
 * and US-22, that is lot 2.
 *
 * French counterpart, kept in sync: docs/analyse/user-stories.md and
 * docs/analyse/regles-gestion.md (RG-05, RG-08).
 */

export const CAMPAIGN_NAME_MAX_LENGTH = 120;
export const CAMPAIGN_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * A reference has to describe a sought profile, which takes more than a few
 * words. The floor is low enough not to dictate a style, high enough that an
 * empty-handed "good CV" does not pass for a reference.
 */
export const REFERENCE_TEXT_MIN_LENGTH = 40;
export const REFERENCE_TEXT_MAX_LENGTH = 4000;

/**
 * US-05 — the four types an institution may ask for.
 *
 * `OTHER` is deliberately absent. It is what level 1 returns when a file is
 * none of the four, and RG-02 marks such a document atypical *because* its
 * type is not expected. A campaign that expected `OTHER` would make a document
 * typical by virtue of being unrecognisable, which empties the rule.
 */
export const ExpectedDocumentType = DocumentType.exclude(['OTHER']);
export type ExpectedDocumentType = z.infer<typeof ExpectedDocumentType>;

const name = z.string().trim().min(1).max(CAMPAIGN_NAME_MAX_LENGTH);
const description = z.string().trim().max(CAMPAIGN_DESCRIPTION_MAX_LENGTH);

/** A campaign opens before it closes, or the window means nothing. */
const windowIsOrdered = <T extends { opensAt?: Date | null; closesAt?: Date | null }>(
  value: T,
): boolean => {
  if (value.opensAt == null || value.closesAt == null) return true;
  return value.opensAt.getTime() < value.closesAt.getTime();
};

const WINDOW_MESSAGE = 'closesAt must be after opensAt';

/**
 * US-04 — a campaign is born a draft and accepts no import.
 *
 * Creation asks for the little that identifies it. Everything the analysis
 * needs — expected types, threshold, weighting, references — is configured
 * afterwards, because a campaign cannot be activated before all of it exists
 * anyway (RG-08).
 */
export const CreateCampaignInput = z
  .object({
    name,
    description: description.optional(),
    opensAt: z.coerce.date().nullish(),
    closesAt: z.coerce.date().nullish(),
  })
  .refine(windowIsOrdered, { message: WINDOW_MESSAGE, path: ['closesAt'] });
export type CreateCampaignInput = z.infer<typeof CreateCampaignInput>;

/**
 * US-06 — the weighting is normalised by its sum, so the three values need not
 * add up to anything in particular and the interface sliders never have to
 * constrain one another (RG-05).
 *
 * A weighting that is zero across the board is refused here rather than at
 * scoring time: it is a misconfigured campaign, and finding out when the first
 * document is scored would be finding out far too late.
 */
export const CampaignWeighting = ScoreWeighting.refine(
  (w) => w.relevance + w.clarity + w.formalQuality > 0,
  { message: 'RG-05: at least one weight must be above zero' },
);
export type CampaignWeighting = z.infer<typeof CampaignWeighting>;

/**
 * US-05, US-06 — the analysis settings.
 *
 * Every field is optional so a screen can save one section without resending
 * the rest, but `expectedTypes`, when given, carries at least one type: an
 * empty list would silently make every document atypical (RG-02).
 */
export const UpdateCampaignInput = z
  .object({
    name,
    description: description.nullable(),
    expectedTypes: z.array(ExpectedDocumentType).min(1),
    confidenceThreshold: z.number().int().min(0).max(100),
    weighting: CampaignWeighting,
    opensAt: z.coerce.date().nullable(),
    closesAt: z.coerce.date().nullable(),
  })
  .partial()
  .refine(windowIsOrdered, { message: WINDOW_MESSAGE, path: ['closesAt'] });
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignInput>;

/**
 * US-22, RG-08 — a reference takes one of two forms, never both.
 *
 * The union mirrors the `reference_profile_exactly_one_form` CHECK constraint
 * on purpose: the database refuses a reference that is empty or doubly filled,
 * and this refuses it one layer earlier with a message a human can read. Two
 * statements of one rule, neither of which can drift silently — the constraint
 * would reject what this one let through.
 */
const ReferenceTextForm = z.strictObject({
  form: z.literal('TEXT'),
  documentType: ExpectedDocumentType,
  text: z.string().trim().min(REFERENCE_TEXT_MIN_LENGTH).max(REFERENCE_TEXT_MAX_LENGTH),
});

/**
 * What the API accepts today: the described profile, and only it.
 *
 * The uploaded form is in the model below and in the database, and it is not
 * reachable yet — there is no route that stores a file, and US-22 refuses an
 * unreadable reference *at save time*, which needs the extraction chain of lot
 * 4. Accepting a `storageKey` from the caller in the meantime would record a
 * pointer to a file nobody wrote, and let the caller choose where it points.
 */
export const ReferenceTextInput = ReferenceTextForm;
export type ReferenceTextInput = z.infer<typeof ReferenceTextInput>;

export const ReferenceProfileInput = z.discriminatedUnion('form', [
  // Strict on purpose. A plain object schema *strips* the keys it does not
  // know, so a payload carrying a text and a file would have been accepted
  // with the file quietly dropped — the opposite of what the CHECK constraint
  // says. Strictness is what makes these two statements of RG-08 agree.
  z.strictObject({
    form: z.literal('TEXT'),
    documentType: ExpectedDocumentType,
    text: z.string().trim().min(REFERENCE_TEXT_MIN_LENGTH).max(REFERENCE_TEXT_MAX_LENGTH),
  }),
  z.strictObject({
    form: z.literal('FILE'),
    documentType: ExpectedDocumentType,
    fileName: z.string().trim().min(1).max(255),
    storageKey: z.string().trim().min(1),
  }),
]);
export type ReferenceProfileInput = z.infer<typeof ReferenceProfileInput>;

/**
 * What still stands between a campaign and its activation.
 *
 * Returned as a list rather than a first failure: the screen shows everything
 * left to do at once, instead of revealing it one save at a time.
 */
export type ActivationBlocker =
  'NO_EXPECTED_TYPE' | 'MISSING_REFERENCE_PROFILE' | 'CLOSED_WINDOW' | 'ZERO_WEIGHTING';

/**
 * US-04, US-22, RG-08 — a campaign goes active only once the analysis has
 * everything it needs to be explainable.
 *
 * A pure function, so it holds for the API that enforces it and the screen
 * that previews it without either of them restating the rule.
 */
export function activationBlockers(campaign: {
  expectedTypes: DocumentType[];
  profiledTypes: DocumentType[];
  weighting: ScoreWeighting;
  opensAt?: Date | null;
  closesAt?: Date | null;
}): ActivationBlocker[] {
  const blockers: ActivationBlocker[] = [];

  if (campaign.expectedTypes.length === 0) {
    blockers.push('NO_EXPECTED_TYPE');
  } else {
    const profiled = new Set(campaign.profiledTypes);
    // RG-08: one reference per expected type, and the level 2 sub-score of
    // relevance has nothing to compare against for a type that lacks one.
    if (campaign.expectedTypes.some((type) => !profiled.has(type))) {
      blockers.push('MISSING_REFERENCE_PROFILE');
    }
  }

  const { relevance, clarity, formalQuality } = campaign.weighting;
  if (relevance + clarity + formalQuality <= 0) {
    blockers.push('ZERO_WEIGHTING');
  }

  if (!windowIsOrdered(campaign)) {
    blockers.push('CLOSED_WINDOW');
  }

  return blockers;
}
