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

/** What was done, as recorded in the audit trail. */
export const AuditAction = z.enum([
  'USER_LOGGED_IN',
  'USER_LOGIN_FAILED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DEACTIVATED',
  'CAMPAIGN_CREATED',
  'CAMPAIGN_UPDATED',
  'REFERENCE_PROFILE_UPDATED',
  'BATCH_IMPORTED',
  'BATCH_REJECTED',
  'ARCHIVE_ENTRY_REJECTED',
  'IDENTITY_RECONCILED',
  'ANALYSIS_VERDICT_OVERRIDDEN',
  'APPLICATION_DELETED',
  'APPLICATION_PURGED',
  'RANKING_EXPORTED',
]);
export type AuditAction = z.infer<typeof AuditAction>;

/** What the audited action was done to. */
export const AuditEntityType = z.enum([
  'INSTITUTION',
  'USER',
  'CAMPAIGN',
  'REFERENCE_PROFILE',
  'IMPORT_BATCH',
  'APPLICATION',
  'DOCUMENT',
  'SESSION',
]);
export type AuditEntityType = z.infer<typeof AuditEntityType>;

/** Where a document's identity source came from when grouping candidates. */
export const IdentitySource = z.enum(['FOLDER', 'FILENAME', 'CONTENT', 'MANUAL']);
export type IdentitySource = z.infer<typeof IdentitySource>;
