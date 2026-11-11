import { mkdir, rm } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { monorepoRoot } from '../common/monorepo-root';

/**
 * The only code that touches the document volume (Q-08, 11/11/2026).
 *
 * A storage key is `{institutionId}/{campaignId}/{batchId}/{uuid}.pdf`, built
 * here and nowhere else. Nothing the user supplied ever enters it: the path an
 * archive gives a file is displayed, never used to place it.
 *
 * Every path is resolved and checked against the caller's institution before
 * the disk is touched. The database already filters by institution; this is a
 * second barrier that does not depend on the first. A faulty query that hands
 * over another institution's key stops here instead of serving the file.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KEY = /^[0-9a-f-]{36}(\/[0-9a-f-]{36}){0,2}(\/[0-9a-f-]{36}\.pdf)?$/;

export class StorageKeyRefused extends Error {
  constructor(key: string) {
    super(`Storage key refused for this institution: ${key}`);
    this.name = 'StorageKeyRefused';
  }
}

export interface BatchLocation {
  institutionId: string;
  campaignId: string;
  batchId: string;
}

@Injectable()
export class StorageService {
  readonly root: string;

  constructor(config: ConfigService) {
    const configured = config.getOrThrow<string>('STORAGE_DIR');
    // Relative to the repository, like the .env that names it — not to
    // whichever directory the process happened to start in.
    this.root = isAbsolute(configured) ? configured : resolve(monorepoRoot(), configured);
  }

  /** The key prefix of a batch. Every part must be a UUID the server made. */
  batchKey({ institutionId, campaignId, batchId }: BatchLocation): string {
    for (const id of [institutionId, campaignId, batchId]) {
      if (!UUID.test(id)) throw new StorageKeyRefused(id);
    }
    return `${institutionId}/${campaignId}/${batchId}`;
  }

  documentKey(location: BatchLocation, storedName: string): string {
    const key = `${this.batchKey(location)}/${storedName}`;
    if (!KEY.test(key)) throw new StorageKeyRefused(key);
    return key;
  }

  /**
   * The absolute path of a key, for the institution of the session.
   *
   * Refused unless the key has the shape the server builds and resolves under
   * that institution's own folder. Neither check alone would do: the shape
   * stops `..` and absolute paths, the prefix stops a well-formed key that
   * belongs to someone else.
   */
  pathFor(institutionId: string, key: string): string {
    if (!UUID.test(institutionId) || !KEY.test(key)) throw new StorageKeyRefused(key);
    const ownFolder = resolve(this.root, institutionId) + sep;
    const path = resolve(this.root, key);
    if (!path.startsWith(ownFolder)) throw new StorageKeyRefused(key);
    return path;
  }

  /** Creates the folder a batch unpacks into, and returns its path. */
  async prepareBatch(location: BatchLocation): Promise<string> {
    const path = this.pathFor(location.institutionId, this.batchKey(location));
    await mkdir(path, { recursive: true });
    return path;
  }

  /** Removes a batch and every file in it — an interrupted unpacking, a purge. */
  async removeBatch(location: BatchLocation): Promise<void> {
    await rm(this.pathFor(location.institutionId, this.batchKey(location)), {
      recursive: true,
      force: true,
    });
  }

  /**
   * Where uploads land while they stream in, before any batch exists. Outside
   * every institution's folder, and emptied once the archive is unpacked.
   */
  incomingDirectory(): string {
    return join(this.root, 'incoming');
  }
}
