import { z } from 'zod';
import { MotifAtypique, TypeDocument } from './enums.js';

/**
 * Sortie attendue du modèle pour le niveau 1 — vérification de la nature.
 *
 * Ce schéma sert deux fois : il contraint la génération du modèle
 * (converti en JSON Schema via `z.toJSONSchema`) et il valide la réponse
 * reçue. Ne jamais faire confiance à la sortie brute du modèle.
 */
export const ResultatNiveau1 = z.object({
  typeDetecte: TypeDocument,
  /** Confiance de la classification, en pourcentage entier. */
  confiance: z.number().int().min(0).max(100),
  /** Justification courte, affichée telle quelle dans le drill-down. */
  justification: z.string().min(1).max(600),
});
export type ResultatNiveau1 = z.infer<typeof ResultatNiveau1>;

/**
 * Sortie attendue du modèle pour le niveau 2 — adéquation à la campagne.
 * N'est demandée que pour les documents non atypiques (RG-04).
 */
export const ResultatNiveau2 = z.object({
  scoreAdequation: z.number().int().min(0).max(100),
  scoreClarte: z.number().int().min(0).max(100),
  scoreQualiteFormelle: z.number().int().min(0).max(100),
  justificationAdequation: z.string().min(1).max(600),
  justificationClarte: z.string().min(1).max(600),
  justificationQualiteFormelle: z.string().min(1).max(600),
});
export type ResultatNiveau2 = z.infer<typeof ResultatNiveau2>;

/** Pondération des trois sous-scores, configurée par campagne. */
export const Ponderation = z.object({
  adequation: z.number().min(0).max(1),
  clarte: z.number().min(0).max(1),
  qualiteFormelle: z.number().min(0).max(1),
});
export type Ponderation = z.infer<typeof Ponderation>;

/** Verdict du niveau 1 une fois les règles de gestion appliquées. */
export const VerdictNiveau1 = z.discriminatedUnion('estAtypique', [
  z.object({
    estAtypique: z.literal(true),
    motif: MotifAtypique,
  }),
  z.object({
    estAtypique: z.literal(false),
  }),
]);
export type VerdictNiveau1 = z.infer<typeof VerdictNiveau1>;
