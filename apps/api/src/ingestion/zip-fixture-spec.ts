import { crc32, deflateRawSync } from 'node:zlib';

/**
 * A ZIP writer for tests, byte by byte.
 *
 * The archives RG-07 must refuse are exactly the ones well-behaved tools
 * refuse to make: a `../` name, a symbolic link, a header that lies about its
 * size. Writing them by hand is the only way to be sure the test exercises the
 * attack and not a library's courtesy.
 *
 * Named `-spec.ts` so the build leaves it out, without the `.spec.ts` that
 * would make Jest run it as a suite.
 */
export interface FixtureEntry {
  name: string;
  content?: Buffer;
  /** Deflate the content — needed for anything with a ratio to speak of. */
  deflate?: boolean;
  /** A Unix mode, e.g. `0o120777` for a symbolic link. */
  unixMode?: number;
  /** Overrides the uncompressed size written in the headers — a lie. */
  declaredSize?: number;
}

const UNIX_HOST = 3 << 8;
const VERSION = 20;
const UTF8_NAMES = 0x800;

export function buildZip(entries: FixtureEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const raw = entry.content ?? Buffer.alloc(0);
    const data = entry.deflate ? deflateRawSync(raw) : raw;
    const method = entry.deflate ? 8 : 0;
    const crc = crc32(raw);
    const size = entry.declaredSize ?? raw.length;
    const mode = entry.unixMode ?? 0o100644;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(UNIX_HOST | VERSION, 4);
    central.writeUInt16LE(VERSION, 6);
    central.writeUInt16LE(UTF8_NAMES, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((mode << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, directory, end]);
}

/** The smallest content that passes the signature check. */
export function pdf(body = 'candidate'): Buffer {
  return Buffer.from(`%PDF-1.7\n${body}\n%%EOF\n`, 'latin1');
}
