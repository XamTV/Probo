import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { type OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';
import { IMPORT_QUEUE, type ImportJobProgress } from './import-queue';

/**
 * The import queue's events, as seen from Redis.
 *
 * Read from Redis and not from the worker's memory: the stream and the worker
 * may live in different processes, and the day they do, nothing here changes.
 */
@QueueEventsListener(IMPORT_QUEUE)
export class ImportEventsListener extends QueueEventsHost implements OnModuleDestroy {
  readonly progress$ = new Subject<{ jobId: string; data: ImportJobProgress }>();
  /** A job finished, well or badly: the batch is to be read again. */
  readonly ended$ = new Subject<string>();

  @OnQueueEvent('progress')
  onProgress({ jobId, data }: { jobId: string; data: unknown }): void {
    this.progress$.next({ jobId, data: data as ImportJobProgress });
  }

  @OnQueueEvent('completed')
  onCompleted({ jobId }: { jobId: string }): void {
    this.ended$.next(jobId);
  }

  @OnQueueEvent('failed')
  onFailed({ jobId }: { jobId: string }): void {
    this.ended$.next(jobId);
  }

  onModuleDestroy(): void {
    this.progress$.complete();
    this.ended$.complete();
  }
}
