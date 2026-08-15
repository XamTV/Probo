import { z } from 'zod';

/** Nature d'un document, telle que déterminée par l'analyse de niveau 1. */
export const TypeDocument = z.enum([
  'CV',
  'LETTRE_MOTIVATION',
  'LETTRE_RECOMMANDATION',
  'PORTFOLIO',
  'AUTRE',
]);
export type TypeDocument = z.infer<typeof TypeDocument>;

/** Raison pour laquelle un document est écarté du calcul de score. */
export const MotifAtypique = z.enum([
  /** La confiance du niveau 1 est sous le seuil de la campagne. */
  'CONFIANCE_INSUFFISANTE',
  /** Le type détecté ne figure pas parmi les types attendus par la campagne. */
  'TYPE_INATTENDU',
  /** Aucun texte exploitable n'a pu être extrait du fichier. */
  'ILLISIBLE',
]);
export type MotifAtypique = z.infer<typeof MotifAtypique>;

/** Comment le texte du document a été obtenu. */
export const MethodeExtraction = z.enum(['NATIVE', 'OCR', 'ECHEC']);
export type MethodeExtraction = z.infer<typeof MethodeExtraction>;

/** Machine à états du traitement d'un document. */
export const StatutDocument = z.enum([
  'EN_ATTENTE',
  'EXTRACTION',
  'ANALYSE_NIVEAU_1',
  'ANALYSE_NIVEAU_2',
  'TERMINE',
  'ERREUR',
]);
export type StatutDocument = z.infer<typeof StatutDocument>;

/** Origine d'un lot de documents. */
export const SourceImport = z.enum(['ZIP', 'GOOGLE_DRIVE']);
export type SourceImport = z.infer<typeof SourceImport>;
