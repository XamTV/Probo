import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { ImportBatchDetail } from '@probo/shared';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { buildZip, pdf } from '../src/ingestion/zip-fixture-spec';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

/**
 * Lot 3 — US-07, end to end: upload, queue, worker, database, volume.
 *
 * Against the real database and the real Redis. The worker runs in the test's
 * own process, as it does in the API: what is checked is what a user gets.
 */
describe('Lot 3 — archive import', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;

  const server = (): Server => app.getHttpServer() as Server;

  const A = 'aaaaaaaa-0000-4000-8000-000000000031';
  const B = 'bbbbbbbb-0000-4000-8000-000000000032';
  const ACTIVE = 'aaaaaaaa-0000-4000-8000-0000000000c1';
  const DRAFT = 'aaaaaaaa-0000-4000-8000-0000000000c2';
  const PASSWORD = 'correct-horse-battery-staple';

  let officerA: string;
  let officerB: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    storage = app.get(StorageService);
    const hash = await app.get(AuthService).hashPassword(PASSWORD);

    await prisma.institution.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.institution.create({ data: { id: A, name: 'École A' } });
    await prisma.institution.create({ data: { id: B, name: 'École B' } });
    for (const [institutionId, email] of [
      [A, 'charge-a@import.test'],
      [B, 'charge-b@import.test'],
    ]) {
      await prisma.user.create({
        data: { institutionId, email, name: email, passwordHash: hash },
      });
    }
    await prisma.campaign.create({
      data: { id: ACTIVE, institutionId: A, name: 'Active', status: 'ACTIVE' },
    });
    await prisma.campaign.create({ data: { id: DRAFT, institutionId: A, name: 'Draft' } });

    officerA = await signIn('charge-a@import.test');
    officerB = await signIn('charge-b@import.test');
  });

  afterAll(async () => {
    await rm(join(storage.root, A), { recursive: true, force: true });
    await prisma.institution.deleteMany({ where: { id: { in: [A, B] } } });
    await app.close();
  });

  async function signIn(email: string): Promise<string> {
    const res = await request(server())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    return cookies.find((c) => c.startsWith('probo_session='))!;
  }

  const deposit = (cookie: string, campaignId: string, archive: Buffer, name = 'lot.zip') =>
    request(server())
      .post(`/api/campaigns/${campaignId}/imports`)
      .set('Cookie', cookie)
      .attach('archive', archive, name);

  /** Reads the batch until the worker is done with it. */
  async function settled(id: string): Promise<ImportBatchDetail> {
    for (let i = 0; i < 100; i++) {
      const res = await request(server())
        .get(`/api/imports/${id}`)
        .set('Cookie', officerA)
        .expect(200);
      const batch = res.body as ImportBatchDetail;
      if (batch.status !== 'PENDING' && batch.status !== 'UNPACKING') return batch;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Batch ${id} never settled`);
  }

  describe('US-07 — an archive that unpacks', () => {
    let batch: ImportBatchDetail;

    beforeAll(async () => {
      const archive = buildZip([
        { name: 'candidatures/dubois_marie/cv.pdf', content: pdf('Marie Dubois') },
        { name: 'candidatures/dubois_marie/lettre.pdf', content: pdf('Lettre') },
        { name: 'candidatures/martin_paul/cv.pdf', content: pdf('Paul Martin') },
        { name: 'candidatures/scan.pdf', content: pdf('?') },
        { name: 'candidatures/notes.docx', content: Buffer.from('docx') },
        { name: '../../etc/cron.d/task.pdf', content: pdf() },
      ]);
      const res = await deposit(officerA, ACTIVE, archive, 'candidatures_été.zip').expect(202);
      expect((res.body as { status: string }).status).toBe('PENDING');
      batch = await settled((res.body as { id: string }).id);
    });

    it('waits for the identity reading, with its documents and its refusals counted', () => {
      expect(batch.status).toBe('READING_IDENTITY');
      expect(batch.fileCount).toBe(4);
      expect(batch.rejectedFileCount).toBe(2);
      expect(batch.archiveName).toBe('candidatures_été.zip');
    });

    it('lists every refused entry with its reason — never silently ignored', () => {
      expect(batch.rejectedEntries.map((e) => [e.path, e.reason])).toEqual([
        ['candidatures/notes.docx', 'FORBIDDEN_TYPE'],
        ['../../etc/cron.d/task.pdf', 'PATH_ESCAPE'],
      ]);
    });

    it('groups by sub-folder and leaves the unhinted file an orphan', async () => {
      const documents = await prisma.document.findMany({
        where: { importBatchId: batch.id },
        select: {
          originalFilename: true,
          storageKey: true,
          application: { select: { candidateName: true, identitySource: true } },
        },
        orderBy: { originalFilename: 'asc' },
      });
      expect(
        documents.map((d) => [d.originalFilename, d.application?.candidateName ?? null]),
      ).toEqual([
        ['candidatures/dubois_marie/cv.pdf', 'dubois_marie'],
        ['candidatures/dubois_marie/lettre.pdf', 'dubois_marie'],
        ['candidatures/martin_paul/cv.pdf', 'martin_paul'],
        ['candidatures/scan.pdf', null],
      ]);
      expect(documents[0].application?.identitySource).toBe('FOLDER');

      for (const document of documents) {
        expect(document.storageKey.startsWith(`${A}/${ACTIVE}/${batch.id}/`)).toBe(true);
        expect(existsSync(storage.pathFor(A, document.storageKey))).toBe(true);
      }
    });

    it('writes the path escape to the audit trail, and the plain refusal not', async () => {
      const incidents = await prisma.auditEntry.findMany({
        where: { institutionId: A, action: 'ARCHIVE_ENTRY_REJECTED', entityId: batch.id },
        select: { details: true },
      });
      expect(incidents.map((i) => i.details)).toEqual([
        { path: '../../etc/cron.d/task.pdf', reason: 'PATH_ESCAPE' },
      ]);
    });

    it('deletes the uploaded archive once unpacked', async () => {
      expect(await readdir(storage.incomingDirectory())).toEqual([]);
    });

    it('opens the progress stream on the batch as stored, then closes it', async () => {
      const res = await request(server())
        .get(`/api/imports/${batch.id}/events`)
        .set('Cookie', officerA)
        .buffer(true)
        .parse((response, done) => {
          let text = '';
          response.on('data', (chunk: Buffer) => (text += chunk.toString()));
          response.on('end', () => done(null, text));
        })
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
      expect(res.body as string).toContain('event: progress');
      expect(res.body as string).toContain('"status":"READING_IDENTITY"');
    });
  });

  describe('RG-07 — an archive ceiling fails the whole batch', () => {
    it('keeps nothing of a decompression bomb, and says which ceiling stopped it', async () => {
      const bomb = buildZip([
        { name: 'cv.pdf', content: pdf() },
        { name: 'bomb.pdf', content: Buffer.alloc(8 * 1024 * 1024), deflate: true },
      ]);
      const res = await deposit(officerA, ACTIVE, bomb).expect(202);
      const batch = await settled((res.body as { id: string }).id);

      expect(batch.status).toBe('FAILED');
      expect(batch.archiveLimit).toBe('DECOMPRESSION_RATIO');
      expect(batch.observedRatio).toBeGreaterThan(100);
      expect(batch.rejectedEntries.map((e) => e.reason)).toEqual(['ARCHIVE_LIMIT']);
      expect(batch.rejectedFileCount).toBe(0);
      expect(await prisma.document.count({ where: { importBatchId: batch.id } })).toBe(0);
      expect(existsSync(join(storage.root, A, ACTIVE, batch.id))).toBe(false);

      const rejected = await prisma.auditEntry.count({
        where: { action: 'BATCH_REJECTED', entityId: batch.id },
      });
      expect(rejected).toBe(1);
    });
  });

  describe('CU-04 — what is refused before a batch exists', () => {
    it('refuses a file that is not a ZIP, and creates no batch', async () => {
      const before = await prisma.importBatch.count({ where: { campaignId: ACTIVE } });
      const res = await deposit(officerA, ACTIVE, Buffer.from('%PDF-1.7 not an archive')).expect(
        400,
      );
      expect((res.body as { message: string }).message).toBe('NOT_A_ZIP');
      expect(await prisma.importBatch.count({ where: { campaignId: ACTIVE } })).toBe(before);
    });

    it('refuses an import into a draft campaign', async () => {
      const res = await deposit(officerA, DRAFT, buildZip([{ name: 'cv.pdf', content: pdf() }]));
      expect(res.status).toBe(409);
      expect((res.body as { message: string }).message).toBe('CAMPAIGN_NOT_ACTIVE');
    });

    it('refuses a request without an archive', async () => {
      await request(server())
        .post(`/api/campaigns/${ACTIVE}/imports`)
        .set('Cookie', officerA)
        .expect(400);
    });
  });

  describe('US-03 — another institution sees nothing', () => {
    it("cannot import into another institution's campaign", async () => {
      await deposit(officerB, ACTIVE, buildZip([{ name: 'cv.pdf', content: pdf() }])).expect(404);
    });

    it("cannot read another institution's batch, nor follow it", async () => {
      const own = await prisma.importBatch.findFirstOrThrow({ where: { campaignId: ACTIVE } });
      await request(server()).get(`/api/imports/${own.id}`).set('Cookie', officerB).expect(404);
      await request(server())
        .get(`/api/imports/${own.id}/events`)
        .set('Cookie', officerB)
        .expect(404);
    });
  });
});
