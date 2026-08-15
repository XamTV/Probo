import type { Level1Result, Level1Verdict, Level2Result, ScoreWeighting } from './analysis.js';
import type { DocumentType, ExtractionMethod } from './enums.js';

/**
 * Probo business rules.
 *
 * This file is the source of truth for the domain. Every rule carries a stable
 * identifier (RG-xx) reused verbatim in test names and in the French project
 * report, so that a documented rule, an implemented rule and a tested rule stay
 * traceable to one another.
 *
 * French counterpart, kept in sync: docs/analyse/regles-gestion.md (RG-xx).
 */

/** Default weighting for a new campaign: relevance counts double. */
export const DEFAULT_SCORE_WEIGHTING: ScoreWeighting = {
  relevance: 0.5,
  clarity: 0.25,
  formalQuality: 0.25,
};

/** Confidence below which a classification is not accepted. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 70;

/**
 * RG-01 — A document is atypical when level 1 confidence is strictly below the
 *         threshold configured on the campaign.
 * RG-02 — A document is atypical when its detected type is not among the types
 *         the campaign expects.
 * RG-03 — A document whose text could not be extracted is atypical, reason
 *         UNREADABLE. No model call is made for it.
 *
 * Precedence: UNREADABLE, then LOW_CONFIDENCE, then UNEXPECTED_TYPE.
 * Confidence outranks type because a type detected with low confidence is not
 * usable information — reporting "unexpected type" would assert the nature of a
 * document we precisely failed to recognise, and mislead the user.
 */
export function evaluateLevel1(params: {
  extractionMethod: ExtractionMethod;
  result: Level1Result | null;
  confidenceThreshold: number;
  expectedTypes: readonly DocumentType[];
}): Level1Verdict {
  const { extractionMethod, result, confidenceThreshold, expectedTypes } = params;

  // RG-03
  if (extractionMethod === 'FAILED' || result === null) {
    return { isAtypical: true, reason: 'UNREADABLE' };
  }

  // RG-01
  if (result.confidence < confidenceThreshold) {
    return { isAtypical: true, reason: 'LOW_CONFIDENCE' };
  }

  // RG-02
  if (!expectedTypes.includes(result.detectedType)) {
    return { isAtypical: true, reason: 'UNEXPECTED_TYPE' };
  }

  return { isAtypical: false };
}

/**
 * RG-04 — Level 2 only runs on documents that are not atypical.
 *
 * This function exists so the rule is named and testable rather than buried in
 * a condition inside the worker.
 */
export function shouldRunLevel2(verdict: Level1Verdict): boolean {
  return !verdict.isAtypical;
}

/**
 * RG-05 — A document's score is the weighted mean of its three sub-scores,
 *         using the weights defined on the campaign.
 *
 * Weights are normalised by their sum, so a campaign whose weights do not add
 * up to 1 stays usable and the UI sliders need not constrain one another.
 *
 * @throws when the weights sum to zero — that is a misconfigured campaign, not
 *         a domain case to absorb silently.
 */
export function computeDocumentScore(scores: Level2Result, weighting: ScoreWeighting): number {
  const weightSum = weighting.relevance + weighting.clarity + weighting.formalQuality;

  if (weightSum <= 0) {
    throw new Error('RG-05: campaign score weights must sum to a strictly positive value.');
  }

  const total =
    scores.relevanceScore * weighting.relevance +
    scores.clarityScore * weighting.clarity +
    scores.formalQualityScore * weighting.formalQuality;

  return round(total / weightSum);
}

/**
 * RG-06 — An application's overall score is the mean of the scores of its
 *         retained documents. An application with no usable document has NO
 *         score: it is `null`, never zero.
 *
 * The distinction carries the product. Zero would mean "weak application" and
 * would rank it last; `null` means "nothing to evaluate", which pulls it out of
 * the ranking and surfaces it for manual handling. Conflating the two would
 * produce invisible false negatives — the worst outcome for an admissions
 * officer, who would discard a good application without ever knowing.
 */
export function computeApplicationScore(documentScores: readonly number[]): number | null {
  if (documentScores.length === 0) {
    return null;
  }

  const total = documentScores.reduce((sum, score) => sum + score, 0);
  return round(total / documentScores.length);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
