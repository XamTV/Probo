import { Subject, lastValueFrom, toArray } from 'rxjs';
import { ImportsService } from './imports.service';

describe('Q-05 — the progress stream of a batch', () => {
  const caller = { id: 'u', institutionId: 'i', email: 'e', name: 'n', role: 'ADMIN' as const };

  function setup(initial: string) {
    const stored = { status: initial, fileCount: 0, rejectedFileCount: 0 };
    const prisma = {
      importBatch: {
        findFirst: () =>
          Promise.resolve({
            id: 'b',
            campaignId: 'c',
            archiveName: 'a.zip',
            status: initial,
            fileCount: 0,
            rejectedFileCount: 0,
            archiveLimit: null,
            archiveSizeBytes: null,
            extractedBytesAtAbort: null,
            observedRatio: null,
            createdAt: new Date(),
            completedAt: null,
            rejectedEntries: [],
          }),
        findUniqueOrThrow: () => Promise.resolve({ ...stored }),
      },
    };
    const events = {
      progress$: new Subject<{ jobId: string; data: unknown }>(),
      ended$: new Subject<string>(),
    };
    const service = new ImportsService(prisma as never, {} as never, events as never, {} as never);
    return { service, stored, events };
  }

  it('sends the batch as stored, and closes at once when unpacking is over', async () => {
    const { service, stored } = setup('READING_IDENTITY');
    Object.assign(stored, { fileCount: 3, rejectedFileCount: 1 });

    const events = await lastValueFrom((await service.progress(caller, 'b')).pipe(toArray()));

    expect(events).toEqual([
      {
        type: 'progress',
        data: { status: 'READING_IDENTITY', fileCount: 3, rejectedFileCount: 1, entriesSeen: 4 },
      },
    ]);
  });

  it("relays the worker's progress for this batch only, then reads the batch again", async () => {
    const { service, stored, events } = setup('UNPACKING');
    const stream = await service.progress(caller, 'b');
    const received = lastValueFrom(stream.pipe(toArray()));

    await new Promise((resolve) => setImmediate(resolve));
    events.progress$.next({ jobId: 'other', data: { entriesSeen: 9, accepted: 9, refused: 0 } });
    events.progress$.next({ jobId: 'b', data: { entriesSeen: 2, accepted: 1, refused: 1 } });
    Object.assign(stored, { status: 'READING_IDENTITY', fileCount: 3, rejectedFileCount: 1 });
    events.ended$.next('b');

    expect((await received).map((e) => e.data)).toEqual([
      { status: 'UNPACKING', fileCount: 0, rejectedFileCount: 0, entriesSeen: 0 },
      { status: 'UNPACKING', fileCount: 1, rejectedFileCount: 1, entriesSeen: 2 },
      { status: 'READING_IDENTITY', fileCount: 3, rejectedFileCount: 1, entriesSeen: 4 },
    ]);
  });
});
