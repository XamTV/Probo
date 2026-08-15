import { describe, expect, it } from 'vitest';
import type { ResultatNiveau1, ResultatNiveau2 } from './analyse.js';
import {
  PONDERATION_PAR_DEFAUT,
  calculerScoreCandidature,
  calculerScoreDocument,
  doitExecuterNiveau2,
  evaluerNiveau1,
} from './regles-gestion.js';

const cv: ResultatNiveau1 = {
  typeDetecte: 'CV',
  confiance: 92,
  justification: 'Structure chronologique, rubriques formation et expérience.',
};

const attendus = ['CV', 'LETTRE_MOTIVATION'] as const;

describe('evaluerNiveau1', () => {
  it('RG-03 : un texte non extrait est atypique au motif ILLISIBLE', () => {
    expect(
      evaluerNiveau1({
        methodeExtraction: 'ECHEC',
        resultat: null,
        seuilConfiance: 70,
        typesAttendus: attendus,
      }),
    ).toEqual({ estAtypique: true, motif: 'ILLISIBLE' });
  });

  it('RG-01 : une confiance sous le seuil rend le document atypique', () => {
    expect(
      evaluerNiveau1({
        methodeExtraction: 'NATIVE',
        resultat: { ...cv, confiance: 69 },
        seuilConfiance: 70,
        typesAttendus: attendus,
      }),
    ).toEqual({ estAtypique: true, motif: 'CONFIANCE_INSUFFISANTE' });
  });

  it('RG-01 : une confiance égale au seuil est acceptée', () => {
    expect(
      evaluerNiveau1({
        methodeExtraction: 'NATIVE',
        resultat: { ...cv, confiance: 70 },
        seuilConfiance: 70,
        typesAttendus: attendus,
      }),
    ).toEqual({ estAtypique: false });
  });

  it('RG-02 : un type hors des attendus rend le document atypique', () => {
    expect(
      evaluerNiveau1({
        methodeExtraction: 'NATIVE',
        resultat: { ...cv, typeDetecte: 'PORTFOLIO' },
        seuilConfiance: 70,
        typesAttendus: attendus,
      }),
    ).toEqual({ estAtypique: true, motif: 'TYPE_INATTENDU' });
  });

  it('la confiance prime sur le type : un type inattendu mal reconnu remonte CONFIANCE_INSUFFISANTE', () => {
    expect(
      evaluerNiveau1({
        methodeExtraction: 'NATIVE',
        resultat: { ...cv, typeDetecte: 'PORTFOLIO', confiance: 40 },
        seuilConfiance: 70,
        typesAttendus: attendus,
      }),
    ).toEqual({ estAtypique: true, motif: 'CONFIANCE_INSUFFISANTE' });
  });
});

describe('doitExecuterNiveau2', () => {
  it('RG-04 : un document atypique ne passe pas au niveau 2', () => {
    expect(doitExecuterNiveau2({ estAtypique: true, motif: 'ILLISIBLE' })).toBe(false);
    expect(doitExecuterNiveau2({ estAtypique: false })).toBe(true);
  });
});

describe('calculerScoreDocument', () => {
  const scores: ResultatNiveau2 = {
    scoreAdequation: 80,
    scoreClarte: 60,
    scoreQualiteFormelle: 40,
    justificationAdequation: '—',
    justificationClarte: '—',
    justificationQualiteFormelle: '—',
  };

  it('RG-05 : applique la pondération de la campagne', () => {
    // 80 × 0.5 + 60 × 0.25 + 40 × 0.25 = 65
    expect(calculerScoreDocument(scores, PONDERATION_PAR_DEFAUT)).toBe(65);
  });

  it('RG-05 : normalise des poids qui ne totalisent pas 1', () => {
    // Mêmes proportions que la pondération par défaut, doublées.
    expect(
      calculerScoreDocument(scores, { adequation: 1, clarte: 0.5, qualiteFormelle: 0.5 }),
    ).toBe(65);
  });

  it('RG-05 : refuse une pondération entièrement nulle', () => {
    expect(() =>
      calculerScoreDocument(scores, { adequation: 0, clarte: 0, qualiteFormelle: 0 }),
    ).toThrow(/RG-05/);
  });
});

describe('calculerScoreCandidature', () => {
  it('RG-06 : moyenne les scores des documents retenus', () => {
    expect(calculerScoreCandidature([80, 60])).toBe(70);
  });

  it('RG-06 : une candidature sans document exploitable vaut null, pas zéro', () => {
    expect(calculerScoreCandidature([])).toBeNull();
  });
});
