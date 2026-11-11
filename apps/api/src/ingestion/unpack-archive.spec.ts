import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_INGESTION_LIMITS, type IngestionLimits } from './ingestion-limits';
import { unpackArchive } from './unpack-archive';
import { buildZip, pdf, type FixtureEntry } from './zip-fixture-spec';

let workspace: string;
let destination: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'probo-unpack-'));
  // Nested twice, so that a zip slip of two levels would still land inside
  // the workspace, where the test can see it.
  destination = join(workspace, 'a', 'b', 'batch');
  await mkdir(destination, { recursive: true });
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

async function unpack(entries: FixtureEntry[], limits: Partial<IngestionLimits> = {}) {
  const archive = join(workspace, 'upload.zip');
  await writeFile(archive, buildZip(entries));
  return unpackArchive(archive, destination, { ...DEFAULT_INGESTION_LIMITS, ...limits });
}

/** Every file under the workspace, wherever an attack might have put it. */
async function everyFile(): Promise<string[]> {
  const entries = await readdir(workspace, { recursive: true, withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name !== 'upload.zip').map((e) => e.name);
}

describe('RG-07 — unpacking an archive that passes every condition', () => {
  it('writes each document under a server-made name and keeps its archive path', async () => {
    const content = pdf('Marie Dubois');
    const result = await unpack([
      { name: 'dubois_marie/' },
      { name: 'dubois_marie/cv.pdf', content },
    ]);

    expect(result.aborted).toBeNull();
    expect(result.refused).toEqual([]);
    expect(result.accepted).toHaveLength(1);

    const [file] = result.accepted;
    expect(file.archivePath).toBe('dubois_marie/cv.pdf');
    expect(file.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(file.sizeBytes).toBe(content.length);
    expect(file.sha256).toBe(createHash('sha256').update(content).digest('hex'));
    expect(await readFile(join(destination, file.storedName))).toEqual(content);
  });

  it('reads accented names written in UTF-8', async () => {
    const result = await unpack([{ name: 'hélène_léger/cv.pdf', content: pdf() }]);
    expect(result.accepted[0].archivePath).toBe('hélène_léger/cv.pdf');
  });
});

describe('RG-07 — an entry that fails a condition is refused, and the batch goes on', () => {
  it('sets aside each kind of faulty entry and imports the rest', async () => {
    const result = await unpack(
      [
        { name: 'dubois_marie/cv.pdf', content: pdf() },
        { name: '../../etc/cron.d/task.pdf', content: pdf() },
        {
          name: 'nguyen_thomas/lien_cv.pdf',
          content: Buffer.from('/etc/passwd'),
          unixMode: 0o120777,
        },
        { name: 'lefevre_adrien/notes.docx', content: Buffer.from('PK docx') },
        { name: '__MACOSX/._cv.pdf', content: Buffer.from('apple double') },
        { name: 'marchand_lea/cv.pdf', content: Buffer.from('MZ executable in disguise') },
        { name: 'vasseur_chloe/scan.pdf', content: pdf('x'.repeat(5000)) },
      ],
      { maxFileSizeBytes: 1024 },
    );

    expect(result.aborted).toBeNull();
    expect(result.accepted.map((f) => f.archivePath)).toEqual(['dubois_marie/cv.pdf']);
    expect(result.refused.map((r) => [r.path, r.reason])).toEqual([
      ['../../etc/cron.d/task.pdf', 'PATH_ESCAPE'],
      ['nguyen_thomas/lien_cv.pdf', 'NOT_REGULAR_FILE'],
      ['lefevre_adrien/notes.docx', 'FORBIDDEN_TYPE'],
      ['__MACOSX/._cv.pdf', 'SYSTEM_ENTRY'],
      ['marchand_lea/cv.pdf', 'FORBIDDEN_TYPE'],
      ['vasseur_chloe/scan.pdf', 'FILE_TOO_LARGE'],
    ]);
    expect(result.refused[1].sizeBytes).toBeNull();
  });

  it('writes nothing for a zip slip, inside the destination or above it', async () => {
    await unpack([
      { name: '../../escaped.pdf', content: pdf() },
      { name: '..\\..\\escaped-too.pdf', content: pdf() },
    ]);
    expect(await everyFile()).toEqual([]);
  });

  it('measures the size on the stream when the header understates it', async () => {
    const result = await unpack(
      [{ name: 'liar.pdf', content: pdf('x'.repeat(5000)), declaredSize: 10 }],
      { maxFileSizeBytes: 1024 },
    );
    expect(result.refused).toEqual([
      expect.objectContaining({ path: 'liar.pdf', reason: 'FILE_TOO_LARGE' }),
    ]);
    expect(await everyFile()).toEqual([]);
  });
});

describe('RG-07 — an archive ceiling interrupts the whole batch', () => {
  it('stops a decompression bomb on the measured ratio, and deletes what was written', async () => {
    const result = await unpack([
      { name: 'first/cv.pdf', content: pdf() },
      { name: 'bomb.pdf', content: Buffer.alloc(8 * 1024 * 1024), deflate: true },
    ]);

    expect(result.aborted).toEqual(
      expect.objectContaining({ limit: 'DECOMPRESSION_RATIO', entryPath: 'bomb.pdf' }),
    );
    expect(result.aborted!.observedRatio).toBeGreaterThan(100);
    expect(result.accepted).toEqual([]);
    expect(await everyFile()).toEqual([]);
  });

  it('trusts the stream and not the header that claims the bomb is small', async () => {
    const result = await unpack([
      {
        name: 'bomb.pdf',
        content: Buffer.alloc(8 * 1024 * 1024),
        deflate: true,
        declaredSize: 100,
      },
    ]);
    expect(result.aborted?.limit).toBe('DECOMPRESSION_RATIO');
  });

  it('stops on the total unpacked size, even at an innocent ratio', async () => {
    const result = await unpack(
      [
        { name: 'a/cv.pdf', content: pdf('a'.repeat(1500)) },
        { name: 'b/cv.pdf', content: pdf('b'.repeat(1500)) },
        { name: 'c/cv.pdf', content: pdf('c'.repeat(1500)) },
      ],
      { maxExtractedBytes: 3000 },
    );

    expect(result.aborted).toEqual(
      expect.objectContaining({ limit: 'EXTRACTED_SIZE', entryPath: 'b/cv.pdf' }),
    );
    expect(result.aborted!.observedRatio).toBeLessThan(2);
    expect(await everyFile()).toEqual([]);
  });

  it('stops past the file count, and does not count the folders', async () => {
    const twoFiles = [
      { name: 'a/' },
      { name: 'a/cv.pdf', content: pdf() },
      { name: 'b/' },
      { name: 'b/cv.pdf', content: pdf() },
    ];
    expect((await unpack(twoFiles, { maxFileCount: 2 })).aborted).toBeNull();

    const result = await unpack([...twoFiles, { name: 'c/cv.pdf', content: pdf() }], {
      maxFileCount: 2,
    });
    expect(result.aborted).toEqual(
      expect.objectContaining({ limit: 'FILE_COUNT', entryPath: 'c/cv.pdf' }),
    );
  });

  it('records the entry that tripped the ceiling, apart from the refusals it counts', async () => {
    const result = await unpack(
      [
        { name: 'notes.docx', content: Buffer.from('x') },
        { name: 'a.pdf', content: pdf() },
        { name: 'b.pdf', content: pdf() },
      ],
      { maxFileCount: 2 },
    );
    expect(result.refused.map((r) => r.reason)).toEqual(['FORBIDDEN_TYPE', 'ARCHIVE_LIMIT']);
  });
});
