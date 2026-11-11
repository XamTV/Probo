import { posix } from 'node:path';
import type { RejectionReason } from '@probo/shared';

/**
 * RG-07 — the checks an archive entry must pass on its NAME and its HEADER,
 * before a single byte of its content is read.
 *
 * Kept pure, apart from the unpacking loop, so that each condition is tested
 * on the hostile name itself rather than through a crafted archive.
 */

/**
 * A root that only exists to resolve against. No entry is ever written under
 * its own name — files land under a key the server builds — so the question
 * condition 1 asks is what the entry *claims*, and that needs no real
 * directory to answer.
 */
const VIRTUAL_ROOT = '/archive';

/**
 * Condition 1: the resolved path stays inside the destination directory.
 *
 * Resolved, then compared — never searched for `..`, which encoding and
 * redundant segments get around. Backslashes count as separators: an archive
 * made on Windows writes `..\..\x`, and the server must not read that as one
 * harmless file name.
 */
export function escapesDestination(entryName: string): boolean {
  if (entryName.includes('\0')) return true;
  const name = entryName.replace(/\\/g, '/');
  if (/^[a-zA-Z]:/.test(name)) return true;
  const resolved = posix.resolve(VIRTUAL_ROOT, name);
  return !resolved.startsWith(`${VIRTUAL_ROOT}/`);
}

/** A directory entry carries no content: it is skipped, never extracted. */
export function isDirectoryEntry(entryName: string): boolean {
  return entryName.endsWith('/') || entryName.endsWith('\\');
}

/** The ZIP "made by" values whose external attributes hold a Unix mode. */
const UNIX_HOSTS = new Set([3, 19]);
const FILE_TYPE_MASK = 0o170000;
const REGULAR_FILE = 0o100000;

/**
 * Condition 2: a regular file — not a symbolic link, not a device, not a pipe.
 *
 * A symbolic link is stored as an entry whose content is its target and whose
 * mode says "link". Extracted naively, `cv.pdf -> /etc/passwd` becomes a
 * document that reads the server's files.
 *
 * An archive made on a host without Unix modes cannot express a link, and a
 * mode of zero is how several tools write a plain file: both are regular.
 */
export function isRegularFile(versionMadeBy: number, externalFileAttributes: number): boolean {
  const host = versionMadeBy >> 8;
  if (!UNIX_HOSTS.has(host)) return true;
  const type = (externalFileAttributes >>> 16) & FILE_TYPE_MASK;
  return type === 0 || type === REGULAR_FILE;
}

const SYSTEM_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

/**
 * What an operating system adds to an archive behind its user's back: the
 * `__MACOSX/` tree and its AppleDouble `._` files, Finder and Explorer
 * metadata. Not a PDF whatever its name says — but worth a label of its own,
 * because the user never made it.
 */
export function isSystemEntry(entryName: string): boolean {
  const segments = entryName.replace(/\\/g, '/').split('/');
  const base = segments[segments.length - 1] ?? '';
  return (
    segments.includes('__MACOSX') || base.startsWith('._') || SYSTEM_FILES.has(base.toLowerCase())
  );
}

/** Condition 3, first half: the extension. The content is checked once read. */
export function hasAllowedExtension(entryName: string): boolean {
  return entryName.toLowerCase().endsWith('.pdf');
}

/**
 * How far into a file the PDF signature may sit. The specification puts it
 * first, readers tolerate a short preamble, and so does this check.
 */
export const PDF_SIGNATURE_WINDOW = 1024;
const PDF_SIGNATURE = Buffer.from('%PDF-', 'latin1');

/**
 * Condition 3, second half: the actual type. A `cv.pdf.exe` fails on its
 * extension; a `cv.pdf` that is an executable fails here. The name is a claim,
 * the bytes are the evidence — which is the whole argument of the product.
 */
export function looksLikePdf(head: Buffer): boolean {
  return head.subarray(0, PDF_SIGNATURE_WINDOW).includes(PDF_SIGNATURE);
}

/**
 * Every check that can be settled from the name and the header, in the order
 * that makes the reported reason the most useful one. A path escape is
 * reported as such even when the entry is also a link: the security incident
 * is the fact worth recording.
 */
export function rejectOnHeader(header: {
  name: string;
  versionMadeBy: number;
  externalFileAttributes: number;
  declaredSize: number;
  maxFileSizeBytes: number;
}): RejectionReason | null {
  if (escapesDestination(header.name)) return 'PATH_ESCAPE';
  if (!isRegularFile(header.versionMadeBy, header.externalFileAttributes)) {
    return 'NOT_REGULAR_FILE';
  }
  if (isSystemEntry(header.name)) return 'SYSTEM_ENTRY';
  if (!hasAllowedExtension(header.name)) return 'FORBIDDEN_TYPE';
  if (header.declaredSize > header.maxFileSizeBytes) return 'FILE_TOO_LARGE';
  return null;
}

/** The two refusals that are attacks rather than accidents: they are audited. */
export function isSecurityIncident(reason: RejectionReason): boolean {
  return reason === 'PATH_ESCAPE' || reason === 'NOT_REGULAR_FILE';
}
