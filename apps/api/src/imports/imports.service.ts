import { unlink } from 'node:fs/promises';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  type MessageEvent,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  type ImportBatchDetail,
  type ImportBatchView,
  ImportErrorCode,
  type ImportProgressEvent,
  type SessionUser,
} from '@probo/shared';
import type { Queue } from 'bullmq';
import type { Request } from 'express';
import { Observable, defer, filter, from, interval, map, merge, mergeMap, takeWhile } from 'rxjs';
import * as yauzl from 'yauzl';
import { AuditService } from '../audit/audit.service';
import { orNotFound, scopedWhere } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { ImportEventsListener } from './import-events.listener';
import { IMPORT_QUEUE, type ImportJobData } from './import-queue';

/** How often the stream says it is still alive, under any proxy's idle timeout. */
const KEEPALIVE_MS = 15_000;

const VIEW = {
  id: true,
  campaignId: true,
  archiveName: true,
  status: true,
  fileCount: true,
  rejectedFileCount: true,
  archiveLimit: true,
  archiveSizeBytes: true,
  extractedBytesAtAbort: true,
  observedRatio: true,
  createdAt: true,
  completedAt: true,
} as const;

type StoredBatch = {
  id: string;
  campaignId: string;
  archiveName: string;
  status: ImportBatchView['status'];
  fileCount: number;
  rejectedFileCount: number;
  archiveLimit: ImportBatchView['archiveLimit'];
  archiveSizeBytes: bigint | null;
  extractedBytesAtAbort: bigint | null;
  observedRatio: number | null;
  createdAt: Date;
  completedAt: Date | null;
};

/** Byte counts are stored as bigint; JSON has no such thing. 3 GB fits a double. */
function toView(batch: StoredBatch): ImportBatchView {
  return {
    ...batch,
    archiveSizeBytes: batch.archiveSizeBytes === null ? null : Number(batch.archiveSizeBytes),
    extractedBytesAtAbort:
      batch.extractedBytesAtAbort === null ? null : Number(batch.extractedBytesAtAbort),
    createdAt: batch.createdAt.toISOString(),
    completedAt: batch.completedAt?.toISOString() ?? null,
  };
}

/**
 * A batch belongs to an institution through its campaign: the table carries
 * no `institution_id` of its own (MPD), so the tenant filter is the relation.
 * Written once, here, so no query forgets it.
 */
function ownBatch(caller: SessionUser, id: string) {
  return { id, campaign: { institutionId: caller.institutionId } };
}

/** US-07 — depositing an archive, and following what becomes of it. */
@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ImportEventsListener,
    @InjectQueue(IMPORT_QUEUE) private readonly queue: Queue<ImportJobData>,
  ) {}

  /**
   * CU-04, steps 1 to 3. The archive has already streamed to disk — never into
   * memory, at up to 3 GB — and every refusal below deletes it.
   */
  async deposit(
    caller: SessionUser,
    campaignId: string,
    upload: { path: string; originalname: string } | undefined,
    request: Request,
  ): Promise<ImportBatchView> {
    if (!upload) throw new BadRequestException(ImportErrorCode.ARCHIVE_MISSING);

    try {
      // CU-04 2a: another institution's campaign is a 404, like any resource
      // of theirs — the query cannot see it.
      const campaign = orNotFound(
        await this.prisma.campaign.findFirst({
          where: scopedWhere(caller, { id: campaignId }),
          select: { id: true, status: true },
        }),
      );
      if (campaign.status !== 'ACTIVE') {
        throw new ConflictException(ImportErrorCode.CAMPAIGN_NOT_ACTIVE);
      }
      await assertReadableZip(upload.path);
    } catch (error) {
      await unlink(upload.path).catch(() => undefined);
      throw error;
    }

    const batch = await this.prisma.importBatch.create({
      data: { campaignId, userId: caller.id, archiveName: upload.originalname },
      select: VIEW,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'BATCH_IMPORTED',
      entityType: 'IMPORT_BATCH',
      entityId: batch.id,
      details: { archiveName: upload.originalname },
      request,
    });

    // One job per batch, under the batch's id: a second enqueue of the same
    // batch is a no-op rather than a second unpacking.
    await this.queue.add(
      'unpack',
      { batchId: batch.id, archivePath: upload.path, user: caller },
      { jobId: batch.id, attempts: 1, removeOnComplete: true, removeOnFail: 1000 },
    );

    return toView(batch);
  }

  async findOne(caller: SessionUser, id: string): Promise<ImportBatchDetail> {
    const batch = orNotFound(
      await this.prisma.importBatch.findFirst({
        where: ownBatch(caller, id),
        select: {
          ...VIEW,
          rejectedEntries: {
            select: { path: true, sizeBytes: true, reason: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    );
    return {
      ...toView(batch),
      rejectedEntries: batch.rejectedEntries.map((entry) => ({
        ...entry,
        sizeBytes: entry.sizeBytes === null ? null : Number(entry.sizeBytes),
      })),
    };
  }

  /**
   * Q-05 — the progress stream of one batch.
   *
   * It opens on the batch as stored, so a screen closed and reopened loses
   * nothing; then relays what the worker reports; then reads the batch again
   * when the job ends, and closes once nothing more will happen to it.
   *
   * Ownership is checked before the stream exists: another institution's
   * batch is a 404, not an empty stream.
   */
  async progress(caller: SessionUser, id: string): Promise<Observable<MessageEvent>> {
    await this.findOne(caller, id);

    const stored = (): Promise<ImportProgressEvent> =>
      this.prisma.importBatch
        .findUniqueOrThrow({
          where: { id },
          select: { status: true, fileCount: true, rejectedFileCount: true },
        })
        .then((batch) => ({ ...batch, entriesSeen: batch.fileCount + batch.rejectedFileCount }));

    const live = merge(
      this.events.progress$.pipe(
        filter((event) => event.jobId === id),
        map((event): ImportProgressEvent => ({
          status: 'UNPACKING',
          entriesSeen: event.data.entriesSeen,
          fileCount: event.data.accepted,
          rejectedFileCount: event.data.refused,
        })),
      ),
      this.events.ended$.pipe(
        filter((jobId) => jobId === id),
        mergeMap(() => from(stored())),
      ),
    );

    // merge and not concat: listening starts at once, so a job that ends while
    // the first read is in flight is still heard — and read again.
    const updates = merge(defer(stored), live).pipe(
      // Inclusive: the settling event itself goes out before the stream ends.
      takeWhile((event) => isLive(event), true),
      map((data): MessageEvent => ({ type: 'progress', data })),
    );

    // A comment line, which EventSource ignores: it keeps the connection
    // alive through a proxy's idle timeout without the screen seeing anything.
    const keepalive = interval(KEEPALIVE_MS).pipe(
      map((): MessageEvent => ({ comment: 'keepalive' })),
    );

    return new Observable<MessageEvent>((subscriber) => {
      // Only `next`: handing the subscriber itself to a second subscription
      // makes RxJS reuse it, and unsubscribing the keepalive would then close
      // the stream before its completion is delivered — it would hang open.
      const ticks = keepalive.subscribe((event) => subscriber.next(event));
      const main = updates.subscribe({
        next: (event) => subscriber.next(event),
        error: (error: unknown) => subscriber.error(error),
        complete: () => {
          ticks.unsubscribe();
          subscriber.complete();
        },
      });
      return () => {
        ticks.unsubscribe();
        main.unsubscribe();
      };
    });
  }
}

/**
 * Whether lot 3 still has something to report. Past unpacking, the batch waits
 * for the identity reading of lot 4, which will widen this when it exists.
 */
function isLive(event: ImportProgressEvent): boolean {
  return event.status === 'PENDING' || event.status === 'UNPACKING';
}

/**
 * Reads the central directory only: enough to refuse a file that is not a ZIP
 * with a reason the user can act on, before a batch exists to fail.
 */
async function assertReadableZip(path: string): Promise<void> {
  try {
    const zip = await yauzl.openPromise(path, { decodeStrings: false });
    zip.close();
  } catch {
    throw new BadRequestException(ImportErrorCode.NOT_A_ZIP);
  }
}
