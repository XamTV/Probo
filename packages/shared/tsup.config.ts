import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // Emptied on a one-shot build, never in watch mode. Wiping dist while the
  // Angular dev server is running makes it read a package with no types: the
  // declarations take a second longer than the JavaScript, and the error
  // blames @probo/shared for missing types it is in the middle of writing.
  clean: !options.watch,
  sourcemap: true,
}));
