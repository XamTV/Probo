/**
 * US-07 — the grouping HINTS an archive gives: a sub-folder per candidate, or a
 * file-name prefix shared by several files.
 *
 * A hint and nothing more. RG-09 makes the identity read from the text the
 * authority, at lot 4; this only proposes the first grouping, and says where
 * each proposal came from, so it can be confirmed or overturned.
 *
 * A file with no usable hint is attached to nobody. It is an orphan, shown at
 * reconciliation for a human to attach (CU-04 8a) — never given an
 * application of its own, which at 1,248 documents is a silent failure.
 */

export interface HintedGroup {
  /** The folder or the prefix, as the archive spells it. */
  candidateName: string;
  source: 'FOLDER' | 'FILENAME';
  paths: string[];
}

export interface Grouping {
  groups: HintedGroup[];
  orphans: string[];
}

const SEPARATORS = /[\s_\-.]+/;

function wordsOf(text: string): string[] {
  return text.toLowerCase().split(SEPARATORS).filter(Boolean);
}

function segmentsOf(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').filter(Boolean);
}

/**
 * The folders every file sits under. An archive made by zipping a folder puts
 * everything under that folder's name, which says nothing about anyone.
 */
function commonWrapperDepth(all: string[][]): number {
  let depth = 0;
  for (;;) {
    const first = all[0]?.[depth];
    const isSharedFolder = all.every((s) => s.length > depth + 1 && s[depth] === first);
    if (!first || !isSharedFolder) return depth;
    depth += 1;
  }
}

/**
 * The prefix of a file name: everything before its last word. `dubois_marie_cv`
 * gives `dubois_marie`; `cv` gives nothing.
 */
export function namePrefix(fileName: string): string | null {
  const stem = fileName.replace(/\.[^.]*$/, '');
  const match = /^(.*\S)[\s_\-.]+[^\s_\-.]+$/.exec(stem);
  if (!match) return null;
  const prefix = match[1].replace(/[\s_\-.]+$/, '');
  return prefix.split(SEPARATORS).some(Boolean) ? prefix : null;
}

export function groupByHints(paths: string[]): Grouping {
  const split = paths.map((path) => ({ path, segments: segmentsOf(path) }));
  const wrapper = commonWrapperDepth(split.map((s) => s.segments));

  const folders = new Map<string, HintedGroup>();
  const prefixed: { path: string; prefix: string; words: string[] }[] = [];
  const unhinted: string[] = [];

  for (const { path, segments } of split) {
    const below = segments.slice(wrapper);

    if (below.length >= 2) {
      const folder = below[0];
      const group = folders.get(folder) ?? { candidateName: folder, source: 'FOLDER', paths: [] };
      group.paths.push(path);
      folders.set(folder, group);
      continue;
    }

    const prefix = namePrefix(below[0] ?? '');
    if (prefix) prefixed.push({ path, prefix, words: wordsOf(prefix) });
    else unhinted.push(path);
  }

  // `dubois_marie_cv` and `dubois_marie_lettre_motivation` give two prefixes,
  // one word apart. A prefix joins the shortest one it extends word for word,
  // so that a document named in two words does not make a second candidate.
  prefixed.sort((a, b) => a.words.length - b.words.length);
  const byPrefix: { name: string; words: string[]; paths: string[] }[] = [];
  for (const file of prefixed) {
    const host = byPrefix.find((g) => g.words.every((word, i) => file.words[i] === word));
    if (host) host.paths.push(file.path);
    else byPrefix.push({ name: file.prefix, words: file.words, paths: [file.path] });
  }

  const groups: HintedGroup[] = [...folders.values()];
  const orphans = [...unhinted];

  // A prefix is a hint only when files share it. On its own, `scan_001` or
  // `CV_final` names no one: grouping it would make an application per file,
  // the failure RG-09 was written against.
  for (const { name, paths: shared } of byPrefix) {
    if (shared.length >= 2) groups.push({ candidateName: name, source: 'FILENAME', paths: shared });
    else orphans.push(...shared);
  }

  return { groups, orphans };
}
