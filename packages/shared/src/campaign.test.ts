import { describe, expect, it } from 'vitest';
import {
  CreateCampaignInput,
  ReferenceProfileInput,
  UpdateCampaignInput,
  activationBlockers,
} from './campaign.js';

const weighting = { relevance: 0.5, clarity: 0.25, formalQuality: 0.25 };

describe('US-04 — creating a campaign', () => {
  it('accepts a name alone', () => {
    expect(CreateCampaignInput.safeParse({ name: 'Mastère 2027' }).success).toBe(true);
  });

  it('refuses a name made of spaces', () => {
    expect(CreateCampaignInput.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('refuses a window that closes before it opens', () => {
    const result = CreateCampaignInput.safeParse({
      name: 'Mastère 2027',
      opensAt: '2027-03-01',
      closesAt: '2027-02-01',
    });

    expect(result.success).toBe(false);
  });

  it('accepts an open-ended window', () => {
    const result = CreateCampaignInput.safeParse({ name: 'Mastère 2027', opensAt: '2027-03-01' });

    expect(result.success).toBe(true);
  });
});

describe('US-05, US-06 — configuring the analysis', () => {
  it('refuses an empty list of expected types', () => {
    // An empty list would quietly make every document atypical (RG-02).
    expect(UpdateCampaignInput.safeParse({ expectedTypes: [] }).success).toBe(false);
  });

  it('accepts a single expected type', () => {
    expect(UpdateCampaignInput.safeParse({ expectedTypes: ['RESUME'] }).success).toBe(true);
  });

  it('refuses a confidence threshold outside 0 to 100', () => {
    expect(UpdateCampaignInput.safeParse({ confidenceThreshold: 101 }).success).toBe(false);
    expect(UpdateCampaignInput.safeParse({ confidenceThreshold: 70 }).success).toBe(true);
  });

  it('accepts weights that do not add up to one — they are normalised (RG-05)', () => {
    const result = UpdateCampaignInput.safeParse({
      weighting: { relevance: 1, clarity: 1, formalQuality: 1 },
    });

    expect(result.success).toBe(true);
  });

  it('refuses a weighting that is zero throughout', () => {
    const result = UpdateCampaignInput.safeParse({
      weighting: { relevance: 0, clarity: 0, formalQuality: 0 },
    });

    expect(result.success).toBe(false);
  });

  it('accepts a partial update that touches one section only', () => {
    expect(UpdateCampaignInput.safeParse({ name: 'Nouveau nom' }).success).toBe(true);
  });
});

describe('US-22, RG-08 — a reference carries exactly one form', () => {
  const described = {
    form: 'TEXT' as const,
    documentType: 'RESUME' as const,
    text: 'Profil recherché : trois ans d expérience en développement web, autonomie.',
  };

  it('accepts a described profile', () => {
    expect(ReferenceProfileInput.safeParse(described).success).toBe(true);
  });

  it('accepts an uploaded document', () => {
    const result = ReferenceProfileInput.safeParse({
      form: 'FILE',
      documentType: 'RESUME',
      fileName: 'profil-recherche.pdf',
      storageKey: 'reference/abc123.pdf',
    });

    expect(result.success).toBe(true);
  });

  it('refuses a text too short to describe a profile', () => {
    expect(ReferenceProfileInput.safeParse({ ...described, text: 'Un bon CV' }).success).toBe(
      false,
    );
  });

  it('refuses carrying both forms at once', () => {
    // The database says the same thing through a CHECK constraint; this says
    // it one layer earlier, with a message a human can read.
    const result = ReferenceProfileInput.safeParse({
      form: 'TEXT',
      documentType: 'RESUME',
      text: described.text,
      fileName: 'profil-recherche.pdf',
      storageKey: 'reference/abc123.pdf',
    });

    expect(result.success).toBe(false);
  });

  it('refuses a form it does not know', () => {
    expect(ReferenceProfileInput.safeParse({ ...described, form: 'URL' }).success).toBe(false);
  });
});

describe('US-04, RG-08 — what blocks activation', () => {
  it('clears a campaign that has everything', () => {
    const blockers = activationBlockers({
      expectedTypes: ['RESUME', 'COVER_LETTER'],
      profiledTypes: ['RESUME', 'COVER_LETTER'],
      weighting,
    });

    expect(blockers).toEqual([]);
  });

  it('blocks a campaign expecting nothing', () => {
    const blockers = activationBlockers({ expectedTypes: [], profiledTypes: [], weighting });

    expect(blockers).toContain('NO_EXPECTED_TYPE');
  });

  it('blocks an expected type that carries no reference', () => {
    const blockers = activationBlockers({
      expectedTypes: ['RESUME', 'COVER_LETTER'],
      profiledTypes: ['RESUME'],
      weighting,
    });

    expect(blockers).toContain('MISSING_REFERENCE_PROFILE');
  });

  it('ignores a reference for a type no longer expected', () => {
    // Narrowing the expected types leaves an orphan reference behind. It is
    // not an error: the campaign can still be activated, and the reference
    // comes back untouched if the type is expected again.
    const blockers = activationBlockers({
      expectedTypes: ['RESUME'],
      profiledTypes: ['RESUME', 'PORTFOLIO'],
      weighting,
    });

    expect(blockers).toEqual([]);
  });

  it('reports every blocker at once, not the first one', () => {
    const blockers = activationBlockers({
      expectedTypes: [],
      profiledTypes: [],
      weighting: { relevance: 0, clarity: 0, formalQuality: 0 },
    });

    expect(blockers).toHaveLength(2);
    expect(blockers).toEqual(expect.arrayContaining(['NO_EXPECTED_TYPE', 'ZERO_WEIGHTING']));
  });

  it('blocks a window that closes before it opens', () => {
    const blockers = activationBlockers({
      expectedTypes: ['RESUME'],
      profiledTypes: ['RESUME'],
      weighting,
      opensAt: new Date('2027-03-01'),
      closesAt: new Date('2027-02-01'),
    });

    expect(blockers).toContain('CLOSED_WINDOW');
  });
});

describe('US-05 — OTHER is not an expectable type', () => {
  it('refuses OTHER among the expected types', () => {
    // RG-02 marks a document atypical *because* its type is not expected.
    // Expecting OTHER would make an unrecognisable file typical, which empties
    // the rule it is supposed to feed.
    expect(UpdateCampaignInput.safeParse({ expectedTypes: ['OTHER'] }).success).toBe(false);
  });

  it('refuses a reference for OTHER', () => {
    const result = ReferenceProfileInput.safeParse({
      form: 'TEXT',
      documentType: 'OTHER',
      text: 'Profil recherché : trois ans d expérience en développement web, autonomie.',
    });

    expect(result.success).toBe(false);
  });

  it('accepts the four types US-05 lists', () => {
    const result = UpdateCampaignInput.safeParse({
      expectedTypes: ['RESUME', 'COVER_LETTER', 'RECOMMENDATION_LETTER', 'PORTFOLIO'],
    });

    expect(result.success).toBe(true);
  });
});
