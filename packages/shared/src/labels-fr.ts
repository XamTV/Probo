import type { AtypicalReason, DocumentStatus, DocumentType, ImportSource } from './enums.js';

/**
 * French labels for domain enums.
 *
 * The code, the database and the API speak English; the product speaks French.
 * This file is the single boundary between the two, shared by the Angular app
 * and by the PDF export so a label is never written twice.
 */

export const DOCUMENT_TYPE_LABELS_FR: Record<DocumentType, string> = {
  RESUME: 'CV',
  COVER_LETTER: 'Lettre de motivation',
  RECOMMENDATION_LETTER: 'Lettre de recommandation',
  PORTFOLIO: 'Portfolio',
  OTHER: 'Autre',
};

export const ATYPICAL_REASON_LABELS_FR: Record<AtypicalReason, string> = {
  LOW_CONFIDENCE: 'Nature du document incertaine',
  UNEXPECTED_TYPE: 'Type non attendu pour cette campagne',
  UNREADABLE: 'Document illisible',
};

export const DOCUMENT_STATUS_LABELS_FR: Record<DocumentStatus, string> = {
  PENDING: 'En attente',
  EXTRACTING: 'Extraction du texte',
  LEVEL_1_ANALYSIS: 'Vérification de la nature',
  LEVEL_2_ANALYSIS: "Évaluation de l'adéquation",
  COMPLETED: 'Analysé',
  FAILED: 'Erreur',
};

export const IMPORT_SOURCE_LABELS_FR: Record<ImportSource, string> = {
  ZIP: 'Archive ZIP',
  GOOGLE_DRIVE: 'Google Drive',
};
