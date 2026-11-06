import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * The directory holding the workspace root's package.json.
 *
 * Walked up to rather than counted in relative steps. The number of steps
 * between a compiled file and the repository root is not a property of the
 * repository: adding one file outside src/ moves TypeScript's root, which
 * moves dist/main.js down a level, and every `../../..` with it. The symptom
 * was an environment variable reported as missing while sitting in the file,
 * which points nowhere near the cause.
 */
export function monorepoRoot(from: string = __dirname): string {
  let current = from;

  for (;;) {
    const manifest = resolve(current, 'package.json');
    if (existsSync(manifest)) {
      const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
      if (typeof parsed === 'object' && parsed !== null && 'workspaces' in parsed) {
        return current;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`No workspace root above ${from}: no package.json declares workspaces.`);
    }
    current = parent;
  }
}

/** The single .env, at the workspace root. */
export function envFile(from?: string): string {
  return resolve(monorepoRoot(from), '.env');
}
