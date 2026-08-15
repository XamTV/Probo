import { z } from 'zod';

/** Nature of a document, as determined by level 1 analysis. */
export const DocumentType = z.enum([
  'RESUME',
  'COVER_LETTER',
  'RECOMMENDATION_LETTER',
  'PORTFOLIO',
  'OTHER',
]);
export type DocumentType = z.infer<typeof DocumentType>;

/** Why a document is excluded from score computation. */
export const AtypicalReason = z.enum([
  /** Level 1 confidence is below the campaign threshold. */
  'LOW_CONFIDENCE',
  /** The detected type is not among the campaign's expected types. */
  'UNEXPECTED_TYPE',
  /** No usable text could be extracted from the file. */
  'UNREADABLE',
]);
export type AtypicalReason = z.infer<typeof AtypicalReason>;

/** How the document text was obtained. */
export const ExtractionMethod = z.enum(['NATIVE', 'OCR', 'FAILED']);
export type ExtractionMethod = z.infer<typeof ExtractionMethod>;

/** Document processing state machine. */
export const DocumentStatus = z.enum([
  'PENDING',
  'EXTRACTING',
  'LEVEL_1_ANALYSIS',
  'LEVEL_2_ANALYSIS',
  'COMPLETED',
  'FAILED',
]);
export type DocumentStatus = z.infer<typeof DocumentStatus>;

/** Where a batch of documents came from. */
export const ImportSource = z.enum(['ZIP', 'GOOGLE_DRIVE']);
export type ImportSource = z.infer<typeof ImportSource>;
