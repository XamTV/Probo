import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Vérifie que le dossier de conception et le code ne se contredisent pas.
 *
 * Les règles qui les tiennent cohérents vivent dans CLAUDE.md : les
 * identifiants ne se réattribuent pas, une décision s'écrit le jour où elle est
 * prise, rien n'est documenté qui n'existe pas. Elles sont claires depuis le
 * 05/10/2026, et elles ont dérivé quand même — parce que rien ne tombait en
 * panne quand on les enfreignait.
 *
 * Ce fichier est ce qui tombe en panne. Il ne juge ni le style ni le fond : il
 * ne vérifie que des invariants mécaniques, ceux dont la violation est un fait
 * et non une opinion. Un énoncé faux mais cohérent passe.
 *
 * Il est écrit en français comme le reste de l'outillage, et il se lance seul
 * par `npm run coherence`.
 */

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const lire = (chemin: string) => readFileSync(resolve(racine, chemin), 'utf8');

/**
 * Les fichiers que git suit, **plus les fichiers neufs non encore suivis**.
 *
 * Sans `--others`, un document créé dans la séance n'est vérifié par rien
 * jusqu'à son premier commit — c'est-à-dire au moment précis où il est le plus
 * susceptible de citer un identifiant inexistant. `--exclude-standard` laisse
 * de côté ce que .gitignore écarte, donc le client Prisma généré et les sorties
 * de build, qui recopient les commentaires des sources.
 */
function suivis(...motifs: string[]): string[] {
  const sortie = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...motifs],
    { cwd: racine, encoding: 'utf8' },
  );
  return sortie.split('\n').filter(Boolean);
}

// ---------------------------------------------------------------------------
// Les familles d'identifiants, et le document qui fait autorité sur chacune
// ---------------------------------------------------------------------------

const SOURCES = {
  US: 'docs/analyse/user-stories.md',
  RG: 'docs/analyse/regles-gestion.md',
  CU: 'docs/analyse/cas-utilisation.md',
  M: 'docs/analyse/perimetre.md',
  S: 'docs/analyse/perimetre.md',
  C: 'docs/analyse/perimetre.md',
  Q: 'docs/questions-ouvertes.md',
} as const;

type Prefixe = keyof typeof SOURCES;

const PREFIXES = Object.keys(SOURCES) as Prefixe[];
const CLE = /\b(US|RG|CU|M|S|C|Q)-\d{2}\b/g;

/**
 * Le corpus où l'on cherche les citations.
 *
 * `tests/` en est volontairement absent : ce fichier contient des identifiants
 * fictifs pour éprouver ses propres détections, et les compter comme des
 * citations du dossier les ferait tous passer pour des références pendantes.
 */
const CORPUS = [
  '*.md',
  'docs/**/*.md',
  'docs/**/*.puml',
  'docs/**/*.html',
  'apps/**/*.ts',
  'packages/**/*.ts',
  'apps/api/prisma/schema.prisma',
];

/**
 * Les tests du produit — pas ceux de ce fichier.
 *
 * C'est eux qui font foi sur l'état d'une règle de gestion. Y inclure ce
 * fichier-ci ferait passer pour testée toute règle que ses propres exemples
 * citent.
 */
const TESTS_PRODUIT = [
  'apps/**/*.spec.ts',
  'apps/**/*.test.ts',
  'apps/**/*.e2e-spec.ts',
  'packages/**/*.spec.ts',
  'packages/**/*.test.ts',
];

// ---------------------------------------------------------------------------
// Les détections, isolées pour être éprouvées sur des exemples
// ---------------------------------------------------------------------------

/**
 * Un identifiant est déclaré par un titre de section ou par une ligne de
 * tableau. Les deux formes coexistent légitimement — une règle a sa section
 * puis sa ligne au tableau de synthèse — donc on les compte séparément.
 */
export function declarations(
  contenu: string,
  prefixe: string,
  forme: 'titre' | 'tableau',
): string[] {
  const motif =
    forme === 'titre'
      ? new RegExp(`^#+ (${prefixe}-\\d{2})`, 'gm')
      : new RegExp(`^\\| *(${prefixe}-\\d{2})`, 'gm');
  return [...contenu.matchAll(motif)].flatMap((trouve) => (trouve[1] ? [trouve[1]] : []));
}

export function citations(contenu: string): string[] {
  return [...contenu.matchAll(CLE)].map((trouve) => trouve[0]);
}

/**
 * Un identifiant retiré laisse un trou documenté sur place — M-14 depuis
 * l'abandon de l'import Drive. Il est cité pour expliquer son absence, et ces
 * citations ne sont pas des références pendantes.
 */
export function vacants(contenu: string): string[] {
  return contenu
    .split('\n')
    .filter((ligne) => /vacant/i.test(ligne))
    .flatMap(citations);
}

export function doublons(cles: string[]): string[] {
  const vus = new Set<string>();
  const deuxFois = new Set<string>();
  for (const cle of cles) {
    if (vus.has(cle)) deuxFois.add(cle);
    vus.add(cle);
  }
  return [...deuxFois];
}

const MARQUEURS = /à trancher|reste ouvert/i;

/**
 * Une question laissée en suspens doit citer sa clé de registre.
 *
 * Le journal est chronologique : un arbitrage posé au détour d'une entrée de
 * septembre n'est plus visible en novembre. C'est ainsi que la décision sur le
 * jeton d'invitation a vécu trois jours hors du dépôt.
 *
 * Citer le marqueur n'est pas poser une question : « à trancher » entre
 * guillemets ou entre accents graves parle de la règle au lieu de la
 * déclencher, et les passages cités sont donc retirés avant jugement.
 */
export function questionsSansCle(contenu: string): { ligne: number; texte: string }[] {
  return contenu.split('\n').flatMap((texte, index) => {
    const nu = texte.replace(/«[^»]*»/g, '').replace(/`[^`]*`/g, '');
    if (!MARQUEURS.test(nu)) return [];
    if (/\bQ-\d{2}\b/.test(texte)) return [];
    return [{ ligne: index + 1, texte: texte.trim() }];
  });
}

/** L'état annoncé par le tableau de synthèse des règles de gestion. */
export function etats(contenu: string): { cle: string; etat: string }[] {
  const motif = /^\| (RG-\d{2}) .*?\| *(Testée|À implémenter) */gm;
  return [...contenu.matchAll(motif)].flatMap(([, cle, etat]) =>
    cle && etat ? [{ cle, etat }] : [],
  );
}

export function clesAplaties(objet: Record<string, unknown>, prefixe = ''): string[] {
  return Object.entries(objet).flatMap(([cle, valeur]) =>
    valeur && typeof valeur === 'object' && !Array.isArray(valeur)
      ? clesAplaties(valeur as Record<string, unknown>, `${prefixe}${cle}.`)
      : [`${prefixe}${cle}`],
  );
}

// ---------------------------------------------------------------------------
// La langue du produit
//
// Le produit est en anglais — routes, dossiers, noms de fichiers, classes,
// identifiants locaux, commentaires — et le mot que l'utilisateur lit vient
// toujours d'une clé de traduction. La règle est écrite sans ambiguïté depuis
// le 05/10/2026, et le front a dérivé en français sur deux lots entiers avant
// d'être repris le 05/11 : c'est la règle du cadre qui a coûté le plus cher, et
// la seule qui n'avait rien pour la tenir.
// ---------------------------------------------------------------------------

/** Le code du produit : le front, l'API et les contrats partagés. */
const RACINES_PRODUIT = ['apps/web/src', 'apps/api/src', 'packages/shared/src'];

const CODE_PRODUIT = /\.(ts|html)$/;
const EST_UN_TEST = /\.(spec|test|e2e-spec)\.ts$/;

const ACCENTS = /[àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒÆ]/;

/**
 * Les mots qui trahissent une dérive, choisis pour n'exister qu'en français.
 *
 * `analyse`, `importer`, `modifier`, `precedent` et `rapport` en sont absents :
 * ce sont aussi des mots anglais, et un vérificateur qui crie sur du code
 * correct est désarmé avant la fin du mois.
 */
const MOTS_FRANCAIS = new Set([
  'accueil',
  'afficher',
  'ajouter',
  'annuler',
  'campagne',
  'campagnes',
  'candidat',
  'candidats',
  'candidature',
  'candidatures',
  'chargement',
  'classement',
  'connexion',
  'deconnexion',
  'enregistrer',
  'entreprise',
  'entreprises',
  'envoyer',
  'erreur',
  'erreurs',
  'etablissement',
  'etablissements',
  'fermer',
  'identifiant',
  'identifiants',
  'liste',
  'listes',
  'nouveau',
  'nouvelle',
  'ouvrir',
  'parametrage',
  'parametre',
  'parametres',
  'ponderation',
  'recherche',
  'referentiel',
  'referentiels',
  'resultat',
  'resultats',
  'selectionner',
  'seuil',
  'suivant',
  'supprimer',
  'telecharger',
  'utilisateur',
  'utilisateurs',
  'valider',
]);

/** Les lignes qui portent un accent — une chaîne française restée dans le code. */
/** Les fichiers de code du produit, tests compris. */
const produit = () => suivis(...RACINES_PRODUIT).filter((chemin) => CODE_PRODUIT.test(chemin));

export function accentuees(contenu: string): { ligne: number; texte: string }[] {
  return contenu
    .split('\n')
    .flatMap((texte, index) =>
      ACCENTS.test(texte) ? [{ ligne: index + 1, texte: texte.trim() }] : [],
    );
}

/**
 * Les mots français que porte un chemin ou une ligne de code.
 *
 * Les noms de fichiers du dossier de conception sont retirés d'abord : le
 * dossier est en français, et un commentaire qui cite `Connexion.dc.html`
 * désigne une maquette — il ne nomme rien dans le produit. Seules les
 * extensions de documentation sont retirées, jamais `.ts` ni `.html`, sans quoi
 * un fichier nommé en français échapperait justement à la vérification.
 *
 * Les identifiants sont ensuite découpés sur leurs bosses : sans cela,
 * `ParametresCampagne` ne ressemblerait à aucun mot connu.
 */
export function motsFrancais(texte: string): string[] {
  const mots = texte
    .replace(/\S+\.(?:dc\.html|md|puml|png|svg|pdf)\b/gi, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z]+/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean);

  return [...new Set(mots.filter((mot) => MOTS_FRANCAIS.has(mot)))];
}

// ---------------------------------------------------------------------------

describe('Le dossier de conception et le code se tiennent', () => {
  it('ne cite aucun identifiant qui ne soit déclaré quelque part', () => {
    const connus = new Set<string>();
    for (const prefixe of PREFIXES) {
      const contenu = lire(SOURCES[prefixe]);
      for (const forme of ['titre', 'tableau'] as const) {
        for (const cle of declarations(contenu, prefixe, forme)) connus.add(cle);
      }
      for (const cle of vacants(contenu)) connus.add(cle);
    }

    const pendantes = new Map<string, string>();
    for (const fichier of suivis(...CORPUS)) {
      for (const cle of citations(lire(fichier))) {
        if (!connus.has(cle) && !pendantes.has(cle)) pendantes.set(cle, fichier);
      }
    }

    expect(
      [...pendantes].map(([cle, ou]) => `${cle} est cité dans ${ou} mais déclaré nulle part`),
    ).toEqual([]);
  });

  it('ne déclare aucun identifiant deux fois sous la même forme', () => {
    const fautes: string[] = [];
    for (const prefixe of PREFIXES) {
      const contenu = lire(SOURCES[prefixe]);
      for (const forme of ['titre', 'tableau'] as const) {
        for (const cle of doublons(declarations(contenu, prefixe, forme))) {
          fautes.push(`${cle} est déclaré deux fois en ${forme} dans ${SOURCES[prefixe]}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("n'abandonne aucune question ouverte hors du registre", () => {
    const orphelines = questionsSansCle(lire('docs/journal-decisions.md'));
    expect(
      orphelines.map(
        ({ ligne, texte }) =>
          `journal-decisions.md:${ligne} pose une question sans citer de Q-xx — ${texte.slice(0, 70)}`,
      ),
    ).toEqual([]);
  });

  it("annonce l'état de chaque règle de gestion conformément aux tests", () => {
    const regles = lire('docs/analyse/regles-gestion.md');
    const corpus = suivis(...TESTS_PRODUIT)
      .map(lire)
      .join('\n');

    const fautes: string[] = [];
    for (const { cle, etat } of etats(regles)) {
      const citee = new RegExp(`\\b${cle}\\b`).test(corpus);
      if (etat === 'Testée' && !citee) {
        fautes.push(`${cle} est annoncée testée, mais aucun test du produit ne la cite`);
      }
      if (etat === 'À implémenter' && citee) {
        fautes.push(`${cle} est annoncée à implémenter, alors que des tests la citent`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it('porte chaque règle déclarée au tableau de synthèse', () => {
    const regles = lire('docs/analyse/regles-gestion.md');
    const auTableau = new Set(declarations(regles, 'RG', 'tableau'));

    // RG-10 a été écrite le 03/09/2026 et n'y figurait pas jusqu'au 05/11 :
    // elle existait donc sans état connu.
    const absentes = declarations(regles, 'RG', 'titre').filter((cle) => !auTableau.has(cle));
    expect(absentes).toEqual([]);
  });

  it('porte exactement les mêmes clés de traduction dans les deux langues', () => {
    // Une clé présente dans une seule langue affiche son propre nom à
    // l'utilisateur, ce qu'aucun test de composant ne remarque puisqu'ils
    // s'exécutent en français.
    const fr = new Set(clesAplaties(JSON.parse(lire('packages/shared/src/i18n/fr.json'))));
    const en = new Set(clesAplaties(JSON.parse(lire('packages/shared/src/i18n/en.json'))));

    expect([...fr].filter((cle) => !en.has(cle))).toEqual([]);
    expect([...en].filter((cle) => !fr.has(cle))).toEqual([]);
  });

  it("n'écrit aucune chaîne d'interface dans le code du produit", () => {
    // Un accent dans le code du produit est une chaîne française qui n'est pas
    // passée par une clé. Les tests en sont exclus : leurs jeux d'essai et les
    // libellés qu'ils attendent à l'écran sont du français légitime.
    const fautes = produit()
      .filter((chemin) => !EST_UN_TEST.test(chemin))
      .flatMap((chemin) =>
        accentuees(lire(chemin)).map(({ ligne, texte }) => `${chemin}:${ligne} ${texte}`),
      );

    expect(fautes).toEqual([]);
  });

  it('ne nomme rien en français dans le code du produit', () => {
    // Les chemins sont jugés jusque dans les tests — un fichier mal nommé l'est
    // aussi bien sous `.spec.ts`. Leur contenu, non : il cite des libellés.
    const fichiers = produit();

    const chemins = fichiers.flatMap((chemin) => {
      const mots = motsFrancais(chemin);
      return mots.length ? [`${chemin} → ${mots.join(', ')}`] : [];
    });

    const identifiants = fichiers
      .filter((chemin) => !EST_UN_TEST.test(chemin))
      .flatMap((chemin) =>
        lire(chemin)
          .split('\n')
          .flatMap((texte, index) => {
            const mots = motsFrancais(texte);
            return mots.length ? [`${chemin}:${index + 1} → ${mots.join(', ')}`] : [];
          }),
      );

    expect([...chemins, ...identifiants]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Les détections s'éprouvent elles-mêmes.
//
// Un vérificateur qu'on n'a jamais vu échouer ne prouve rien — et un
// vérificateur qui crie trop est désarmé en quinze jours, donc les écritures
// légitimes qui lui ressemblent sont éprouvées aussi.
// ---------------------------------------------------------------------------

describe('Les détections attrapent ce qu elles annoncent', () => {
  it('distingue un titre, une ligne de tableau et une simple mention', () => {
    const extrait = [
      '## RG-01 — Confiance insuffisante',
      '| RG-01 | Énoncé | US-11 | Testée |',
      'Contrairement à RG-01, cette règle…',
    ].join('\n');

    expect(declarations(extrait, 'RG', 'titre')).toEqual(['RG-01']);
    expect(declarations(extrait, 'RG', 'tableau')).toEqual(['RG-01']);
    // Les deux formes coexistent : ce n'est pas une réattribution.
    expect(doublons([...declarations(extrait, 'RG', 'titre')])).toEqual([]);
  });

  it('repère une réattribution, qui est la faute cardinale du dossier', () => {
    expect(doublons(['RG-01', 'RG-02', 'RG-01'])).toEqual(['RG-01']);
  });

  it('relève une référence pendante', () => {
    expect(citations('Dépend de US-99 et de RG-01.')).toEqual(['US-99', 'RG-01']);
  });

  it('tolère un identifiant vacant cité pour expliquer son absence', () => {
    expect(vacants('**M-14 est vacant** depuis l abandon de l import Drive.')).toEqual(['M-14']);
  });

  it('relève une question ouverte sans clé de registre', () => {
    const trouve = questionsSansCle('Le point est à trancher à l implémentation.');
    expect(trouve.map(({ ligne }) => ligne)).toEqual([1]);
  });

  it('tolère une question ouverte qui cite sa clé', () => {
    expect(questionsSansCle('Le point est à trancher à l implémentation (Q-01).')).toEqual([]);
  });

  it('tolère le marqueur cité plutôt que posé', () => {
    expect(questionsSansCle('Le test refuse un « à trancher » sans clé.')).toEqual([]);
    expect(questionsSansCle('Le marqueur `reste ouvert` est détecté.')).toEqual([]);
  });

  it("lit l'état annoncé d'une règle au tableau de synthèse", () => {
    const tableau = [
      '| RG-05 | Score document = moyenne pondérée | US-06 | Testée        |',
      '| RG-07 | Décompression défensive           | US-07 | À implémenter |',
    ].join('\n');

    expect(etats(tableau)).toEqual([
      { cle: 'RG-05', etat: 'Testée' },
      { cle: 'RG-07', etat: 'À implémenter' },
    ]);
  });

  it('aplatit les traductions imbriquées pour les comparer clé à clé', () => {
    expect(clesAplaties({ auth: { title: 'Connexion' }, app: { name: 'Probo' } })).toEqual([
      'auth.title',
      'app.name',
    ]);
  });

  it('relève une chaîne française restée dans un gabarit', () => {
    expect(accentuees('<h1>Paramètres de la campagne</h1>').map(({ ligne }) => ligne)).toEqual([1]);
  });

  it('relève un nom français jusque dans les bosses d un identifiant', () => {
    expect(motsFrancais('export class ParametresCampagne {}')).toEqual(['parametres', 'campagne']);
  });

  it('relève un dossier français dans un chemin', () => {
    expect(motsFrancais('apps/web/src/app/connexion/connexion.ts')).toEqual(['connexion']);
  });

  it('tolère un commentaire qui cite une maquette du dossier', () => {
    // Le dossier de conception est en français : le citer n'est pas dériver.
    expect(motsFrancais('/** US-01 — the screen specified by Connexion.dc.html. */')).toEqual([]);
  });

  it('tolère les mots anglais qui ressemblent à du français', () => {
    expect(motsFrancais('const analysis = analyse(document, modifier, precedent);')).toEqual([]);
  });
});
