import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SessionUser } from '@probo/shared';
import type { Job } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import { isSecurityIncident } from '../ingestion/archive-entry';
import { groupByHints } from '../ingestion/grouping';
import { type IngestionLimits, readIngestionLimits } from '../ingestion/ingestion-limits';
import { type RefusedEntry, type UnpackProgress, unpackArchive } from '../ingestion/unpack-archive';
import { PrismaService } from '../prisma/prisma.service';
import { type BatchLocation, StorageService } from '../storage/storage.service';
import { IMPORT_QUEUE, type ImportJobData, type ImportJobProgress } from './import-queue';

/** How often progress goes to Redis: often enough to look alive, not per file. */
const PROGRESS_EVERY_MS = 250;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * CU-04, steps 4, 5 and 7 — unpacks a deposited archive and records what came
 * out of it. Identity reading (step 6) is lot 4's: a batch leaves this worker
 * as READING_IDENTITY, or as FAILED.
 *
 * One archive at a time. Unpacking holds up to one file in memory and writes
 * gigabytes; two at once would only race each other for the disk.
 */
@Processor(IMPORT_QUEUE, { concurrency: 1 })
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);
  private readonly limits: IngestionLimits;
  private readonly retentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    super();
    this.limits = readIngestionLimits(config);
    // M-12: 90 days unless the deployment says otherwise.
    this.retentionDays = Number(config.get<string>('RETENTION_DAYS') ?? 90);
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { batchId, archivePath, user } = job.data;
    try {
      await this.unpack(job, batchId, archivePath, user);
    } catch (error) {
      // Anything unforeseen: the batch must not stay "unpacking" for ever.
      this.logger.error(`Batch ${batchId} failed`, error as Error);
      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
      throw error;
    } finally {
      await unlink(archivePath).catch(() => undefined);
    }
  }

  private async unpack(
    job: Job<ImportJobData>,
    batchId: string,
    archivePath: string,
    user: SessionUser,
  ): Promise<void> {
    const batch = await this.prisma.importBatch.findUniqueOrThrow({
      where: { id: batchId },
      select: { status: true, campaignId: true, campaign: { select: { institutionId: true } } },
    });
    // A batch is unpacked once. A redelivered job finds it already started.
    if (batch.status !== 'PENDING') return;

    const location: BatchLocation = {
      institutionId: batch.campaign.institutionId,
      campaignId: batch.campaignId,
      batchId,
    };
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'UNPACKING' },
    });

    const destination = await this.storage.prepareBatch(location);
    const result = await unpackArchive(
      archivePath,
      destination,
      this.limits,
      throttled(job, PROGRESS_EVERY_MS),
    );

    const counted = result.refused.filter((entry) => entry.reason !== 'ARCHIVE_LIMIT');

    if (result.aborted) {
      // RG-07: an archive ceiling interrupts everything. What had been written
      // is already gone; the folder goes with it.
      await this.storage.removeBatch(location);
      const { aborted } = result;
      await this.prisma.$transaction([
        this.prisma.rejectedEntry.createMany({ data: rows(batchId, result.refused) }),
        this.prisma.importBatch.update({
          where: { id: batchId },
          data: {
            status: 'FAILED',
            rejectedFileCount: counted.length,
            archiveLimit: aborted.limit,
            archiveSizeBytes: BigInt(aborted.archiveSizeBytes),
            extractedBytesAtAbort: BigInt(aborted.extractedBytes),
            observedRatio: aborted.observedRatio,
            completedAt: new Date(),
          },
        }),
      ]);
      await this.audit.record({
        user,
        institutionId: location.institutionId,
        action: 'BATCH_REJECTED',
        entityType: 'IMPORT_BATCH',
        entityId: batchId,
        details: { limit: aborted.limit, entryPath: aborted.entryPath },
      });
      await this.recordIncidents(user, location.institutionId, batchId, result.refused);
      return;
    }

    const grouping = groupByHints(result.accepted.map((file) => file.archivePath));
    const purgeDueAt = new Date(Date.now() + this.retentionDays * DAY_MS);

    const applications = grouping.groups.map((group) => ({ id: randomUUID(), ...group }));
    const applicationOf = new Map<string, string>();
    for (const application of applications) {
      for (const path of application.paths) applicationOf.set(path, application.id);
    }

    await this.prisma.$transaction([
      this.prisma.application.createMany({
        data: applications.map((application) => ({
          id: application.id,
          campaignId: location.campaignId,
          institutionId: location.institutionId,
          candidateName: application.candidateName,
          identitySource: application.source,
          purgeDueAt,
        })),
      }),
      this.prisma.document.createMany({
        data: result.accepted.map((file) => ({
          // An orphan carries no application: it waits for a human (CU-04 8a).
          applicationId: applicationOf.get(file.archivePath) ?? null,
          importBatchId: batchId,
          institutionId: location.institutionId,
          originalFilename: file.archivePath,
          storageKey: this.storage.documentKey(location, file.storedName),
          sha256: file.sha256,
          sizeBytes: file.sizeBytes,
        })),
      }),
      this.prisma.rejectedEntry.createMany({ data: rows(batchId, result.refused) }),
      this.prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: 'READING_IDENTITY',
          fileCount: result.accepted.length,
          rejectedFileCount: counted.length,
        },
      }),
    ]);

    await this.recordIncidents(user, location.institutionId, batchId, result.refused);
  }

  /**
   * CU-04 5b and 5c: an escaping path and a link are attacks, not accidents.
   * They go to the institution's audit trail as well as to the batch's list —
   * the two have neither the same reader nor the same lifetime.
   */
  private async recordIncidents(
    user: SessionUser,
    institutionId: string,
    batchId: string,
    refused: RefusedEntry[],
  ): Promise<void> {
    for (const entry of refused.filter((e) => isSecurityIncident(e.reason))) {
      await this.audit.record({
        user,
        institutionId,
        action: 'ARCHIVE_ENTRY_REJECTED',
        entityType: 'IMPORT_BATCH',
        entityId: batchId,
        details: { path: entry.path, reason: entry.reason },
      });
    }
  }
}

function rows(importBatchId: string, refused: RefusedEntry[]) {
  return refused.map((entry) => ({
    importBatchId,
    path: entry.path,
    sizeBytes: entry.sizeBytes === null ? null : BigInt(entry.sizeBytes),
    reason: entry.reason,
  }));
}

/** Reports progress at most every `ms`, so 4,000 files are not 4,000 writes. */
function throttled(job: Job, ms: number): (progress: UnpackProgress) => void {
  let last = 0;
  return (progress) => {
    const now = Date.now();
    if (now - last < ms) return;
    last = now;
    const data: ImportJobProgress = progress;
    void job.updateProgress(data);
  };
}
