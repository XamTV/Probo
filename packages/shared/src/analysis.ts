import { z } from 'zod';
import { AtypicalReason, DocumentType } from './enums.js';

/**
 * Expected model output for level 1 — nature verification.
 *
 * This schema does double duty: it constrains generation (converted to JSON
 * Schema through `z.toJSONSchema`) and it validates what comes back. Raw model
 * output is never trusted.
 */
export const Level1Result = z.object({
  detectedType: DocumentType,
  /** Classification confidence, as a whole percentage. */
  confidence: z.number().int().min(0).max(100),
  /** Short rationale, displayed verbatim in the document drill-down. */
  rationale: z.string().min(1).max(600),
});
export type Level1Result = z.infer<typeof Level1Result>;

/**
 * Expected model output for level 2 — campaign relevance.
 * Only requested for documents that passed level 1 (RG-04).
 */
export const Level2Result = z.object({
  relevanceScore: z.number().int().min(0).max(100),
  clarityScore: z.number().int().min(0).max(100),
  formalQualityScore: z.number().int().min(0).max(100),
  relevanceRationale: z.string().min(1).max(600),
  clarityRationale: z.string().min(1).max(600),
  formalQualityRationale: z.string().min(1).max(600),
});
export type Level2Result = z.infer<typeof Level2Result>;

/** Relative weight of the three sub-scores, configured per campaign. */
export const ScoreWeighting = z.object({
  relevance: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  formalQuality: z.number().min(0).max(1),
});
export type ScoreWeighting = z.infer<typeof ScoreWeighting>;

/** Level 1 outcome once the business rules have been applied. */
export const Level1Verdict = z.discriminatedUnion('isAtypical', [
  z.object({
    isAtypical: z.literal(true),
    reason: AtypicalReason,
  }),
  z.object({
    isAtypical: z.literal(false),
  }),
]);
export type Level1Verdict = z.infer<typeof Level1Verdict>;
