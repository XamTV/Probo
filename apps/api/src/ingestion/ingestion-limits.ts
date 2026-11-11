import type { ConfigService } from '@nestjs/config';

/**
 * RG-07 — the ceilings, in bytes and counts.
 *
 * Read from the environment and never written in the code, so that production
 * can tighten them without a redeploy. The defaults are the values settled on
 * 11/11/2026 (Q-04): 4,000 files at an assumed 1 MB each.
 */
export interface IngestionLimits {
  /** Per entry. Exceeding it sets the entry aside; the batch goes on. */
  maxFileSizeBytes: number;
  /** Per archive. Exceeding it interrupts the batch. */
  maxFileCount: number;
  /** Per archive. Checked on the stream, never on the declared sizes. */
  maxExtractedBytes: number;
  /** Per archive: unpacked bytes over archive bytes. */
  maxDecompressionRatio: number;
  /** The upload itself, refused before any batch exists. */
  maxArchiveBytes: number;
}

const MB = 1024 * 1024;

export const DEFAULT_INGESTION_LIMITS: IngestionLimits = {
  maxFileSizeBytes: 20 * MB,
  maxFileCount: 4000,
  maxExtractedBytes: 4096 * MB,
  maxDecompressionRatio: 100,
  maxArchiveBytes: 3072 * MB,
};

function positive(config: ConfigService, key: string, fallback: number): number {
  const raw = config.get<string>(key);
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    // A ceiling that parses to nothing must not silently become "no ceiling".
    throw new Error(`${key} must be a positive number, got "${raw}".`);
  }
  return value;
}

export function readIngestionLimits(config: ConfigService): IngestionLimits {
  const d = DEFAULT_INGESTION_LIMITS;
  return {
    maxFileSizeBytes: positive(config, 'INGESTION_MAX_FILE_SIZE_MB', d.maxFileSizeBytes / MB) * MB,
    maxFileCount: positive(config, 'INGESTION_MAX_FILE_COUNT', d.maxFileCount),
    maxExtractedBytes:
      positive(config, 'INGESTION_MAX_EXTRACTED_SIZE_MB', d.maxExtractedBytes / MB) * MB,
    maxDecompressionRatio: positive(
      config,
      'INGESTION_MAX_DECOMPRESSION_RATIO',
      d.maxDecompressionRatio,
    ),
    maxArchiveBytes: positive(config, 'INGESTION_MAX_ARCHIVE_SIZE_MB', d.maxArchiveBytes / MB) * MB,
  };
}
