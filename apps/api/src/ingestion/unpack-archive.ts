import { createHash, randomUUID } from 'node:crypto';
import { stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import type { ArchiveLimit, RejectionReason } from '@probo/shared';
import * as yauzl from 'yauzl';
import { isDirectoryEntry, looksLikePdf, rejectOnHeader } from './archive-entry';
import type { IngestionLimits } from './ingestion-limits';

/**
 * RG-07 — defensive unpacking of one archive.
 *
 * The archive is the product's only way in, and every byte of it is chosen by
 * the uploader. Two families of failure, deliberately unequal:
 *
 * - an entry that fails a condition is set aside, recorded with its reason,
 *   and the batch goes on — a refusal is counted;
 * - an archive that breaks a ceiling stops everything, and what had been
 *   written is deleted — an attack is interrupted.
 */

/** A file that passed every condition, now on disk under a server-made name. */
export interface AcceptedFile {
  /** The path inside the archive, kept as the archive spells it. */
  archivePath: string;
  /** The name it was written under in the destination directory. */
  storedName: string;
  sizeBytes: number;
  sha256: string;
}

export interface RefusedEntry {
  path: string;
  /** Null for a link or a special entry, which has no content of its own. */
  sizeBytes: number | null;
  reason: RejectionReason;
}

/** Why and where the unpacking was interrupted, with what the screen shows. */
export interface ArchiveAbort {
  limit: ArchiveLimit;
  entryPath: string;
  archiveSizeBytes: number;
  extractedBytes: number;
  observedRatio: number;
}

export interface UnpackProgress {
  entriesSeen: number;
  accepted: number;
  refused: number;
}

export interface UnpackResult {
  /** Empty when the archive was interrupted: nothing it contained is kept. */
  accepted: AcceptedFile[];
  /**
   * Every entry set aside. After an interruption, also the entry that tripped
   * the ceiling, under `ARCHIVE_LIMIT`.
   */
  refused: RefusedEntry[];
  aborted: ArchiveAbort | null;
}

/**
 * Unpacks `archivePath` into `destinationDir`, which must already exist.
 *
 * No entry is ever written under its own name: each accepted file gets a fresh
 * UUID. The entry's path is only ever *displayed* — which is what makes the
 * path check a detection of an attack, and not the only thing standing
 * between the attack and the disk.
 *
 * An entry is read into memory, at most one per-file ceiling's worth, and
 * written only once every condition has passed: RG-07 says "before any write
 * to disk", and it is meant literally.
 */
export async function unpackArchive(
  archivePath: string,
  destinationDir: string,
  limits: IngestionLimits,
  onProgress?: (progress: UnpackProgress) => void,
): Promise<UnpackResult> {
  const archiveSizeBytes = (await stat(archivePath)).size;

  // Names are decoded here, not by the library: its own validation turns a
  // `../` name into an error that closes the whole archive, where RG-07 wants
  // that one entry refused and the rest examined. Sizes are counted on the
  // stream, for the same reason the rule gives: a header can lie.
  const zip = await yauzl.openPromise(archivePath, {
    decodeStrings: false,
    validateEntrySizes: false,
    autoClose: false,
  });

  let closed = false;
  const close = () => {
    if (!closed) zip.close();
    closed = true;
  };

  const accepted: AcceptedFile[] = [];
  const refused: RefusedEntry[] = [];
  let fileCount = 0;
  let entriesSeen = 0;
  let extractedBytes = 0;

  const abort = async (limit: ArchiveLimit, entryPath: string): Promise<UnpackResult> => {
    close();
    await Promise.all(
      accepted.map((file) => unlink(join(destinationDir, file.storedName)).catch(() => undefined)),
    );
    refused.push({ path: entryPath, sizeBytes: null, reason: 'ARCHIVE_LIMIT' });
    return {
      accepted: [],
      refused,
      aborted: {
        limit,
        entryPath,
        archiveSizeBytes,
        extractedBytes,
        observedRatio: archiveSizeBytes > 0 ? extractedBytes / archiveSizeBytes : 0,
      },
    };
  };

  /** Which archive ceiling the bytes read so far have crossed, if any. */
  const crossedCeiling = (): ArchiveLimit | null => {
    if (extractedBytes > limits.maxDecompressionRatio * archiveSizeBytes) {
      return 'DECOMPRESSION_RATIO';
    }
    if (extractedBytes > limits.maxExtractedBytes) return 'EXTRACTED_SIZE';
    return null;
  };

  try {
    for (let entry = await nextEntry(zip); entry; entry = await nextEntry(zip)) {
      entriesSeen += 1;
      const name = yauzl.getFileNameLowLevel(
        entry.generalPurposeBitFlag,
        entry.fileNameRaw,
        entry.extraFields,
        false,
      );

      // A directory has no content to write, and none is ever created: files
      // land flat under server-made names. It is not counted either — an
      // archive of 3,500 files in 700 folders is not 4,200 files.
      if (isDirectoryEntry(name)) continue;

      fileCount += 1;
      if (fileCount > limits.maxFileCount) return await abort('FILE_COUNT', name);

      const onHeader = rejectOnHeader({
        name,
        versionMadeBy: entry.versionMadeBy,
        externalFileAttributes: entry.externalFileAttributes,
        declaredSize: entry.uncompressedSize,
        maxFileSizeBytes: limits.maxFileSizeBytes,
      });
      if (onHeader) {
        refused.push({
          path: name,
          sizeBytes: onHeader === 'NOT_REGULAR_FILE' ? null : entry.uncompressedSize,
          reason: onHeader,
        });
        onProgress?.({ entriesSeen, accepted: accepted.length, refused: refused.length });
        continue;
      }

      let stream: Readable;
      try {
        stream = await zip.openReadStreamPromise(entry);
      } catch {
        // Encrypted, or compressed with a method nothing here can read: its
        // content cannot be shown to be a PDF, which is condition 3's test.
        refused.push({ path: name, sizeBytes: entry.uncompressedSize, reason: 'FORBIDDEN_TYPE' });
        continue;
      }

      const chunks: Buffer[] = [];
      let entryBytes = 0;
      let tooLarge = false;
      let corrupt = false;
      try {
        for await (const chunk of stream as AsyncIterable<Buffer>) {
          entryBytes += chunk.length;
          extractedBytes += chunk.length;

          const ceiling = crossedCeiling();
          if (ceiling) {
            stream.destroy();
            return await abort(ceiling, name);
          }
          if (entryBytes > limits.maxFileSizeBytes) {
            tooLarge = true;
            stream.destroy();
            break;
          }
          chunks.push(chunk);
        }
      } catch {
        corrupt = true;
      }

      const content = tooLarge || corrupt ? null : Buffer.concat(chunks, entryBytes);
      if (tooLarge) {
        refused.push({ path: name, sizeBytes: entryBytes, reason: 'FILE_TOO_LARGE' });
      } else if (!content || !looksLikePdf(content)) {
        refused.push({ path: name, sizeBytes: entryBytes, reason: 'FORBIDDEN_TYPE' });
      } else {
        const storedName = `${randomUUID()}.pdf`;
        // `wx`: never overwrite. A collision on a fresh UUID is a bug, and a
        // bug that silently replaces a candidate's file is the worst kind.
        await writeFile(join(destinationDir, storedName), content, { flag: 'wx' });
        accepted.push({
          archivePath: name,
          storedName,
          sizeBytes: entryBytes,
          sha256: createHash('sha256').update(content).digest('hex'),
        });
      }

      onProgress?.({ entriesSeen, accepted: accepted.length, refused: refused.length });
    }
  } finally {
    close();
  }

  return { accepted, refused, aborted: null };
}

/** One step of the library's lazy iteration, as a promise: null at the end. */
function nextEntry(zip: yauzl.ZipFile): Promise<yauzl.Entry | null> {
  return new Promise((resolve, reject) => {
    const onEntry = (entry: yauzl.Entry) => {
      cleanup();
      resolve(entry);
    };
    const onEnd = () => {
      cleanup();
      resolve(null);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      zip.off('entry', onEntry);
      zip.off('end', onEnd);
      zip.off('error', onError);
    };
    zip.on('entry', onEntry);
    zip.on('end', onEnd);
    zip.on('error', onError);
    zip.readEntry();
  });
}
