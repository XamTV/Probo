import type { Ponderation, ResultatNiveau1, ResultatNiveau2, VerdictNiveau1 } from './analyse.js';
import type { MethodeExtraction, TypeDocument } from './enums.js';

/**
 * Règles de gestion de Probo.
 *
 * Ce fichier est la source de vérité du métier. Chaque règle porte un
 * identifiant stable (RG-xx) repris tel quel dans le dossier professionnel
 * et dans les noms de tests, pour qu'une règle documentée, une règle
 * implémentée et une règle testée soient traçables entre elles.
 */

/** Pondération par défaut d'une nouvelle campagne : les trois axes à parts égales. */
export const PONDERATION_PAR_DEFAUT: Ponderation = {
  adequation: 0.5,
  clarte: 0.25,
  qualiteFormelle: 0.25,
};

/** Seuil de confiance en dessous duquel une classification n'est pas retenue. */
export const SEUIL_CONFIANCE_PAR_DEFAUT = 70;

/**
 * RG-01 — Un document est atypique si la confiance du niveau 1 est
 *         strictement inférieure au seuil configuré sur la campagne.
 * RG-02 — Un document est atypique si son type détecté ne figure pas parmi
 *         les types attendus par la campagne.
 * RG-03 — Un document dont le texte n'a pas pu être extrait est atypique au
 *         motif ILLISIBLE. Aucun appel au modèle n'est effectué pour lui.
 *
 * Ordre de priorité : ILLISIBLE, puis CONFIANCE_INSUFFISANTE, puis
 * TYPE_INATTENDU. La confiance passe avant le type parce qu'un type détecté
 * avec une confiance faible n'est pas une information exploitable — le
 * signaler comme « type inattendu » induirait l'utilisateur en erreur.
 */
export function evaluerNiveau1(params: {
  methodeExtraction: MethodeExtraction;
  resultat: ResultatNiveau1 | null;
  seuilConfiance: number;
  typesAttendus: readonly TypeDocument[];
}): VerdictNiveau1 {
  const { methodeExtraction, resultat, seuilConfiance, typesAttendus } = params;

  // RG-03
  if (methodeExtraction === 'ECHEC' || resultat === null) {
    return { estAtypique: true, motif: 'ILLISIBLE' };
  }

  // RG-01
  if (resultat.confiance < seuilConfiance) {
    return { estAtypique: true, motif: 'CONFIANCE_INSUFFISANTE' };
  }

  // RG-02
  if (!typesAttendus.includes(resultat.typeDetecte)) {
    return { estAtypique: true, motif: 'TYPE_INATTENDU' };
  }

  return { estAtypique: false };
}

/**
 * RG-04 — Le niveau 2 n'est exécuté que sur les documents non atypiques.
 *
 * Cette fonction existe pour que la règle soit nommée et testable plutôt
 * qu'implicite dans une condition du worker.
 */
export function doitExecuterNiveau2(verdict: VerdictNiveau1): boolean {
  return !verdict.estAtypique;
}

/**
 * RG-05 — Le score d'un document est la moyenne pondérée de ses trois
 *         sous-scores, les poids étant définis par la campagne.
 *
 * Les poids sont normalisés par leur somme : une campagne configurée avec
 * des poids qui ne totalisent pas 1 reste exploitable.
 *
 * @throws si la somme des poids est nulle — une campagne dans cet état est
 *         une erreur de configuration, pas un cas métier à absorber.
 */
export function calculerScoreDocument(scores: ResultatNiveau2, poids: Ponderation): number {
  const sommePoids = poids.adequation + poids.clarte + poids.qualiteFormelle;

  if (sommePoids <= 0) {
    throw new Error(
      'RG-05 : la somme des pondérations de la campagne doit être strictement positive.',
    );
  }

  const total =
    scores.scoreAdequation * poids.adequation +
    scores.scoreClarte * poids.clarte +
    scores.scoreQualiteFormelle * poids.qualiteFormelle;

  return arrondir(total / sommePoids);
}

/**
 * RG-06 — Le score global d'une candidature est la moyenne des scores de ses
 *         documents non atypiques. Une candidature dont aucun document n'est
 *         exploitable n'a pas de score : elle vaut `null`, et non zéro.
 *
 * La distinction est essentielle. Zéro signifierait « mauvaise candidature »
 * et la classerait en dernier ; `null` signifie « rien à évaluer » et la sort
 * du classement pour la signaler à l'utilisateur.
 */
export function calculerScoreCandidature(scoresDocuments: readonly number[]): number | null {
  if (scoresDocuments.length === 0) {
    return null;
  }

  const somme = scoresDocuments.reduce((acc, score) => acc + score, 0);
  return arrondir(somme / scoresDocuments.length);
}

function arrondir(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}
