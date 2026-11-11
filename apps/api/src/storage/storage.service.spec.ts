import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { StorageKeyRefused, StorageService } from './storage.service';

let root: string;
let storage: StorageService;

const ours = randomUUID();
const theirs = randomUUID();
const campaignId = randomUUID();
const batchId = randomUUID();
const pdfName = `${randomUUID()}.pdf`;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'probo-storage-'));
  storage = new StorageService({ getOrThrow: () => root } as unknown as ConfigService);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('US-03 — the document volume is partitioned by institution', () => {
  it('builds a key from server-made identifiers only', () => {
    const key = storage.documentKey({ institutionId: ours, campaignId, batchId }, pdfName);
    expect(key).toBe(`${ours}/${campaignId}/${batchId}/${pdfName}`);
  });

  it('refuses to build a key from a name the archive supplied', () => {
    const location = { institutionId: ours, campaignId, batchId };
    expect(() => storage.documentKey(location, 'cv.pdf')).toThrow(StorageKeyRefused);
    expect(() => storage.documentKey(location, '../../x.pdf')).toThrow(StorageKeyRefused);
    expect(() => storage.batchKey({ ...location, batchId: '..' })).toThrow(StorageKeyRefused);
  });

  it("resolves a key of one's own institution under its own folder", () => {
    const key = `${ours}/${campaignId}/${batchId}/${pdfName}`;
    expect(storage.pathFor(ours, key)).toBe(resolve(root, key));
  });

  it('refuses a well-formed key that belongs to another institution', () => {
    // The case the prefix exists for: a faulty query hands over a real key of
    // another tenant. The shape is perfect; only the owner is wrong.
    const forged = `${theirs}/${campaignId}/${batchId}/${pdfName}`;
    expect(() => storage.pathFor(ours, forged)).toThrow(StorageKeyRefused);
  });

  it('refuses a key that climbs out of the folder, whatever it starts with', () => {
    for (const key of [
      `${ours}/../${theirs}/${campaignId}/${pdfName}`,
      `${ours}/${campaignId}/../../${theirs}`,
      '/etc/passwd',
      `${ours}\\..\\${theirs}`,
    ]) {
      expect(() => storage.pathFor(ours, key)).toThrow(StorageKeyRefused);
    }
  });

  it("removes one batch and leaves another institution's untouched", async () => {
    const mine = await storage.prepareBatch({ institutionId: ours, campaignId, batchId });
    const other = await storage.prepareBatch({ institutionId: theirs, campaignId, batchId });
    await writeFile(join(mine, pdfName), 'x');
    await writeFile(join(other, pdfName), 'y');

    await storage.removeBatch({ institutionId: ours, campaignId, batchId });

    expect(existsSync(mine)).toBe(false);
    expect(existsSync(join(other, pdfName))).toBe(true);
  });
});
