import type { ArchiveLimit, ImportBatchStatus, RejectionReason } from './enums.js';

/**
 * An import batch as the screens see it — US-07, lot 3.
 *
 * French counterpart: docs/analyse/user-stories.md (US-07) and
 * docs/analyse/regles-gestion.md (RG-07).
 */

/** The form field that carries the archive in the upload request. */
export const ARCHIVE_FIELD = 'archive';

export interface ImportBatchView {
  id: string;
  campaignId: string;
  archiveName: string;
  status: ImportBatchStatus;
  fileCount: number;
  rejectedFileCount: number;
  /** Set only on a batch RG-07 interrupted, with the three measures below. */
  archiveLimit: ArchiveLimit | null;
  archiveSizeBytes: number | null;
  extractedBytesAtAbort: number | null;
  observedRatio: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RejectedEntryView {
  path: string;
  sizeBytes: number | null;
  reason: RejectionReason;
}

export interface ImportBatchDetail extends ImportBatchView {
  rejectedEntries: RejectedEntryView[];
}

/**
 * What the progress stream pushes (Q-05, 11/11/2026). The first event is the
 * batch as stored, so closing the screen and opening it again loses nothing.
 */
export interface ImportProgressEvent {
  status: ImportBatchStatus;
  /** Entries examined so far, accepted or not. */
  entriesSeen: number;
  fileCount: number;
  rejectedFileCount: number;
}

/**
 * Error codes the upload route answers with, translated by the screen under
 * `import.error.<code>`.
 */
export const ImportErrorCode = {
  NOT_A_ZIP: 'NOT_A_ZIP',
  CAMPAIGN_NOT_ACTIVE: 'CAMPAIGN_NOT_ACTIVE',
  ARCHIVE_MISSING: 'ARCHIVE_MISSING',
} as const;
export type ImportErrorCode = (typeof ImportErrorCode)[keyof typeof ImportErrorCode];
