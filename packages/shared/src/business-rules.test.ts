import { describe, expect, it } from 'vitest';
import type { Level1Result, Level2Result } from './analysis.js';
import {
  DEFAULT_SCORE_WEIGHTING,
  computeApplicationScore,
  computeDocumentScore,
  evaluateLevel1,
  shouldRunLevel2,
} from './business-rules.js';

const resume: Level1Result = {
  detectedType: 'RESUME',
  confidence: 92,
  rationale: 'Chronological structure with education and experience sections.',
};

const expectedTypes = ['RESUME', 'COVER_LETTER'] as const;

describe('evaluateLevel1', () => {
  it('RG-03: unextractable text is atypical with reason UNREADABLE', () => {
    expect(
      evaluateLevel1({
        extractionMethod: 'FAILED',
        result: null,
        confidenceThreshold: 70,
        expectedTypes,
      }),
    ).toEqual({ isAtypical: true, reason: 'UNREADABLE' });
  });

  it('RG-01: confidence below the threshold makes the document atypical', () => {
    expect(
      evaluateLevel1({
        extractionMethod: 'NATIVE',
        result: { ...resume, confidence: 69 },
        confidenceThreshold: 70,
        expectedTypes,
      }),
    ).toEqual({ isAtypical: true, reason: 'LOW_CONFIDENCE' });
  });

  it('RG-01: confidence equal to the threshold is accepted', () => {
    expect(
      evaluateLevel1({
        extractionMethod: 'NATIVE',
        result: { ...resume, confidence: 70 },
        confidenceThreshold: 70,
        expectedTypes,
      }),
    ).toEqual({ isAtypical: false });
  });

  it('RG-02: a type outside the expected list makes the document atypical', () => {
    expect(
      evaluateLevel1({
        extractionMethod: 'NATIVE',
        result: { ...resume, detectedType: 'PORTFOLIO' },
        confidenceThreshold: 70,
        expectedTypes,
      }),
    ).toEqual({ isAtypical: true, reason: 'UNEXPECTED_TYPE' });
  });

  it('confidence outranks type: a poorly recognised unexpected type reports LOW_CONFIDENCE', () => {
    expect(
      evaluateLevel1({
        extractionMethod: 'NATIVE',
        result: { ...resume, detectedType: 'PORTFOLIO', confidence: 40 },
        confidenceThreshold: 70,
        expectedTypes,
      }),
    ).toEqual({ isAtypical: true, reason: 'LOW_CONFIDENCE' });
  });
});

describe('shouldRunLevel2', () => {
  it('RG-04: an atypical document never reaches level 2', () => {
    expect(shouldRunLevel2({ isAtypical: true, reason: 'UNREADABLE' })).toBe(false);
    expect(shouldRunLevel2({ isAtypical: false })).toBe(true);
  });
});

describe('computeDocumentScore', () => {
  const scores: Level2Result = {
    relevanceScore: 80,
    clarityScore: 60,
    formalQualityScore: 40,
    relevanceRationale: '—',
    clarityRationale: '—',
    formalQualityRationale: '—',
  };

  it('RG-05: applies the campaign weighting', () => {
    // 80 × 0.5 + 60 × 0.25 + 40 × 0.25 = 65
    expect(computeDocumentScore(scores, DEFAULT_SCORE_WEIGHTING)).toBe(65);
  });

  it('RG-05: normalises weights that do not sum to 1', () => {
    // Same proportions as the default weighting, doubled.
    expect(computeDocumentScore(scores, { relevance: 1, clarity: 0.5, formalQuality: 0.5 })).toBe(
      65,
    );
  });

  it('RG-05: rejects an all-zero weighting', () => {
    expect(() =>
      computeDocumentScore(scores, { relevance: 0, clarity: 0, formalQuality: 0 }),
    ).toThrow(/RG-05/);
  });
});

describe('computeApplicationScore', () => {
  it('RG-06: averages the scores of retained documents', () => {
    expect(computeApplicationScore([80, 60])).toBe(70);
  });

  it('RG-06: an application with no usable document is null, not zero', () => {
    expect(computeApplicationScore([])).toBeNull();
  });
});
