import { defineConfig } from 'vitest/config';

/**
 * Vitest à la racine ne couvre que `tests/`, qui tient les vérifications du
 * dépôt lui-même — la cohérence entre le dossier de conception et le code.
 *
 * Les tests du produit restent dans leurs workspaces et gardent leur propre
 * lanceur : Vitest pour le front et les contrats partagés, Jest pour l'API.
 *
 * **Ce fichier ne s'appelle pas `vitest.config.ts` à dessein.** Vitest remonte
 * l'arborescence pour trouver une configuration : sous ce nom-là, celle-ci
 * s'appliquerait aussi à `packages/shared` et à `apps/web`, qui cesseraient
 * de trouver leurs propres tests. Elle est donc passée explicitement par
 * `npm run coherence`.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
