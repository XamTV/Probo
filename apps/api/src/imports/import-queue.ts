import type { ConfigService } from '@nestjs/config';
import type { SessionUser } from '@probo/shared';
import type { ConnectionOptions } from 'bullmq';

/** The queue that unpacks deposited archives, one job per batch. */
export const IMPORT_QUEUE = 'import';

export interface ImportJobData {
  batchId: string;
  /** Where the upload streamed to, outside every institution's folder. */
  archivePath: string;
  /** Who deposited it, for the audit entries the worker writes. */
  user: SessionUser;
}

/** What a job reports while it runs, relayed to the progress stream. */
export interface ImportJobProgress {
  entriesSeen: number;
  accepted: number;
  refused: number;
}

/**
 * The Redis connection, from REDIS_URL. Read through ConfigService in a
 * factory: at module definition time the .env has not been loaded yet.
 */
export function redisConnection(config: ConfigService): ConnectionOptions {
  const url = new URL(config.getOrThrow<string>('REDIS_URL'));
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
  };
}
