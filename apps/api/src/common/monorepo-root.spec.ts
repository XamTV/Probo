import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { envFile, monorepoRoot } from './monorepo-root';

describe('monorepoRoot', () => {
  it('finds the same root however deep the caller sits', () => {
    const fromHere = monorepoRoot(__dirname);
    const fromDeeper = monorepoRoot(resolve(__dirname, '../../prisma/migrations'));

    // The point of the helper: the answer does not depend on the distance.
    // Counting ../.. is what broke when the build output moved a level down.
    expect(fromDeeper).toBe(fromHere);
  });

  it('points at the workspace root, not at the api package', () => {
    const root = monorepoRoot(__dirname);

    expect(existsSync(resolve(root, 'package.json'))).toBe(true);
    expect(root).not.toContain(`${resolve('apps')}`);
    expect(envFile(__dirname)).toBe(resolve(root, '.env'));
  });

  it('refuses to guess when there is no workspace above', () => {
    expect(() => monorepoRoot('/')).toThrow(/workspaces/);
  });
});
