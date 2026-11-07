import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
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
const RACINES_PRODUIT = ['apps/web/src', 'apps/api/src', 'apps/api/test', 'packages/shared/src'];

const CODE_PRODUIT = /\.(ts|html)$/;
const EST_UN_TEST = /\.(spec|test|e2e-spec)\.ts$/;

const ACCENTS = /[àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒÆ]/;

/**
 * Les mots qui trahissent une dérive, choisis pour n'exister qu'en français.
 *
 * `analyse`, `importer`, `modifier`, `precedent` et `rapport` en sont absents :
 * ce sont aussi des mots anglais, et un vérificateur qui crie sur du code
 * correct est désarmé avant la fin du mois.
 *
 * Le même vocabulaire juge les noms de variables d'environnement, qui sont du
 * produit au même titre que le reste. Le prix de cette prudence est connu :
 * `INGESTION_RATIO_DECOMPRESSION_MAX` et `MISTRAL_CONCURRENCE_MAX`, tous deux
 * français le 06/11/2026, n'étaient bâtis que de mots qui existent aussi en
 * anglais — seul l'ordre des mots les trahissait, et ce contrôle ne juge pas
 * l'ordre des mots. Six des huit noms fautifs étaient attrapés.
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
  'cloisonnement',
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
  'fichier',
  'fichiers',
  'identifiant',
  'identifiants',
  'jour',
  'jours',
  'liste',
  'listes',
  'modele',
  'modeles',
  'mot',
  'niveau',
  'niveaux',
  'oublie',
  'passe',
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
  'taille',
  'tailles',
  'telecharger',
  'utilisateur',
  'utilisateurs',
  'valider',
]);

/**
 * Les mots outils, appliqués aux seuls intitulés de tests.
 *
 * Un intitulé est de la prose : il trahit sa langue par ses articles et ses
 * pronoms bien avant son vocabulaire métier. « accepte des poids qui ne
 * totalisent pas 1 » ne porte aucun accent et aucun mot de la liste
 * ci-dessus — mais il porte `qui`. Ces mots-là ne sont pas cherchés dans le
 * code, où un identifiant ne ressemble pas à une phrase.
 */
const MOTS_OUTILS = new Set([
  'aucun',
  'aucune',
  'avec',
  'cette',
  'chaque',
  'dans',
  'elle',
  'les',
  'leur',
  'lui',
  'que',
  'qui',
  'sans',
  'ses',
  'sont',
  'tant',
  'une',
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
/**
 * Les intitulés de `describe` et de `it`.
 *
 * Le contenu d'un test échappe à la vérification des accents — ses jeux
 * d'essai sont du français légitime. Son intitulé, non : il décrit le produit,
 * il se lit dans la sortie de la CI, et il suit la même règle que le code.
 */
export function intitules(contenu: string): string[] {
  return [...contenu.matchAll(/\b(?:describe|it)\(\s*(['"])(.*?)\1/g)].flatMap((trouve) =>
    trouve[2] ? [trouve[2]] : [],
  );
}

function decoupe(texte: string): string[] {
  return texte
    .replace(/\S+\.(?:dc\.html|md|puml|png|svg|pdf)\b/gi, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z]+/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean);
}

export function motsFrancais(texte: string): string[] {
  return [...new Set(decoupe(texte).filter((mot) => MOTS_FRANCAIS.has(mot)))];
}

/** Un intitulé est jugé sur son vocabulaire métier **et** sur ses mots outils. */
export function intituleFrancais(intitule: string): boolean {
  return (
    ACCENTS.test(intitule) ||
    decoupe(intitule).some((mot) => MOTS_FRANCAIS.has(mot) || MOTS_OUTILS.has(mot))
  );
}

// ---------------------------------------------------------------------------
// Le dictionnaire des données et le schéma physique
//
// Le dictionnaire est dérivé de `schema.prisma`, qui fait foi, et c'est lui que
// le jury lit. Rien ne les reliait : les quatre colonnes de requalification
// (RG-10) ont vécu des semaines au schéma sans figurer au dictionnaire.
// ---------------------------------------------------------------------------

const SCHEMA = 'apps/api/prisma/schema.prisma';
const DICTIONNAIRE = 'docs/conception/dictionnaire-donnees.md';

export type Colonne = { table: string; colonne: string };

/**
 * Les colonnes scalaires du schéma, sous leur nom physique.
 *
 * Deux pièges, et chacun fabrique un faux positif :
 *
 * - **Un champ de relation n'est pas une colonne.** `documents Document[]` et
 *   `institution Institution @relation(...)` portent le lien ; seule la clé
 *   étrangère, `institutionId`, est une colonne. On les reconnaît à leur type,
 *   qui est un autre `model` — un type d'énumération, lui, est bien une
 *   colonne, liste comprise (`expectedTypes DocumentType[]`).
 * - **Le nom physique est celui de `@map(...)`** quand il y en a un, et celui
 *   de la table celui de `@@map(...)`, qui n'arrive qu'en fin de bloc.
 */
export function colonnesDuSchema(contenu: string): Colonne[] {
  const modeles = new Set(
    [...contenu.matchAll(/^model\s+(\w+)\s*\{/gm)].flatMap((trouve) =>
      trouve[1] ? [trouve[1]] : [],
    ),
  );

  return [...contenu.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].flatMap(
    ([, modele, corps]) => {
      if (!modele || !corps) return [];
      const table = /@@map\("([^"]+)"\)/.exec(corps)?.[1] ?? modele;

      return corps.split('\n').flatMap((ligne) => {
        // Un champ est indenté et commence par un mot : ni `//`, ni `///`,
        // ni `@@index`, ni une ligne vide.
        const champ = /^\s{2,}(\w+)\s+(\w+)/.exec(ligne);
        const nom = champ?.[1];
        const type = champ?.[2];
        if (!nom || !type || modeles.has(type)) return [];
        return [{ table, colonne: /@map\("([^"]+)"\)/.exec(ligne)?.[1] ?? nom }];
      });
    },
  );
}

/**
 * Les colonnes que le dictionnaire décrit, table par table.
 *
 * Seule la **première cellule** d'une ligne de tableau nomme une colonne. Les
 * cellules de type et de description citent des énumérations et d'autres
 * colonnes entre accents graves, et les compter inventerait des colonnes qui
 * n'existent nulle part.
 *
 * Un titre de section qui n'est pas un nom de table physique — « Conventions »,
 * capitale comprise — n'ouvre aucune table.
 */
export function colonnesDuDictionnaire(contenu: string): Colonne[] {
  const colonnes: Colonne[] = [];
  let table: string | null = null;

  for (const ligne of contenu.split('\n')) {
    if (/^#/.test(ligne)) {
      table = /^## ([a-z][a-z0-9_]*)\b/.exec(ligne)?.[1] ?? null;
      continue;
    }
    if (table === null) continue;
    const colonne = /^\| *`([a-z][a-z0-9_]*)` *\|/.exec(ligne)?.[1];
    if (colonne) colonnes.push({ table, colonne });
  }

  return colonnes;
}

/**
 * Les colonnes que le dictionnaire annonce ne pas répéter.
 *
 * Sa section « Conventions » les déclare une fois pour toutes — `created_at` et
 * `updated_at` au 06/11/2026, parce qu'elles n'ont aucune valeur métier. Les
 * lire dans le document plutôt que les écrire ici est ce qui rend ce contrôle
 * tenable : une convention ajoutée demain est honorée sans toucher à ce
 * fichier, et un contrôle qui crie au loup est désarmé à la première gêne.
 * Celui-ci annonçait six colonnes manquantes quand il y en avait quatre.
 *
 * Les liens vers d'autres documents ne sont pas des colonnes : seuls les
 * identifiants en minuscules sont retenus, ce qui écarte `ecarts-mcd-mpd.md`.
 */
export function colonnesParConvention(contenu: string): string[] {
  const texte = `\n${contenu}`;
  const debut = texte.indexOf('\n## Conventions');
  if (debut < 0) return [];

  const reste = texte.slice(debut + 1);
  const suivante = reste.indexOf('\n## ');
  const section = suivante < 0 ? reste : reste.slice(0, suivante);

  return [
    ...new Set(
      [...section.matchAll(/`([^`]+)`/g)].flatMap(([, nom]) =>
        nom && /^[a-z][a-z0-9_]*$/.test(nom) ? [nom] : [],
      ),
    ),
  ];
}

/** L'écart entre le schéma, qui fait foi, et le dictionnaire qui le décrit. */
export function ecartsDictionnaire(schema: string, dictionnaire: string): string[] {
  const omises = new Set(colonnesParConvention(dictionnaire));
  const auSchema = colonnesDuSchema(schema);
  const auDictionnaire = colonnesDuDictionnaire(dictionnaire);

  const decrites = new Set(auDictionnaire.map(({ table, colonne }) => `${table}.${colonne}`));
  const reelles = new Set(auSchema.map(({ table, colonne }) => `${table}.${colonne}`));
  const tablesDecrites = new Set(auDictionnaire.map(({ table }) => table));

  // Une table entière absente se dit en une ligne, pas en quinze.
  const tablesAbsentes = [...new Set(auSchema.map(({ table }) => table))]
    .filter((table) => !tablesDecrites.has(table))
    .map((table) => `la table ${table} n'a aucune section au dictionnaire`);

  const manquantes = auSchema
    .filter(({ table, colonne }) => tablesDecrites.has(table) && !omises.has(colonne))
    .filter(({ table, colonne }) => !decrites.has(`${table}.${colonne}`))
    .map(({ table, colonne }) => `${table}.${colonne} est au schéma et manque au dictionnaire`);

  const inventees = auDictionnaire
    .filter(({ table, colonne }) => !reelles.has(`${table}.${colonne}`))
    .map(({ table, colonne }) => `${table}.${colonne} est au dictionnaire et pas au schéma`);

  return [...tablesAbsentes, ...manquantes, ...inventees];
}

// ---------------------------------------------------------------------------
// Les fichiers d'environnement
//
// Une variable d'environnement est du produit : elle se nomme en anglais. Le
// commentaire qui la documente est de l'outillage et reste en français, et sa
// valeur ne regarde que l'exploitation. Seul le **nom** est jugé.
//
// C'est le troisième angle mort de la règle de langue en deux jours : la portée
// du vérificateur s'arrêtait au code, et sept variables françaises vivaient
// dans `.env.example` au milieu d'une vingtaine en anglais.
// ---------------------------------------------------------------------------

/**
 * Les fichiers d'environnement, listés sur le disque et non par `git ls-files`.
 *
 * `.env` est ignoré par git — c'est le but — et c'est pourtant celui que
 * personne ne relit en revue. `.env.example`, lui, est suivi. En intégration
 * continue, seul le second existe : le contrôle porte sur ce qu'il trouve.
 */
function fichiersEnv(): string[] {
  return readdirSync(racine)
    .filter((nom) => /^\.env(\..+)?$/.test(nom))
    .sort();
}

/**
 * Les noms de variables d'un fichier d'environnement, avec leur ligne.
 *
 * La valeur n'est jamais retenue : elle porte des secrets, et ce fichier écrit
 * ses constats dans la sortie de la CI. Une ligne commentée ne déclare rien.
 */
export function variablesEnv(contenu: string): { ligne: number; nom: string }[] {
  return contenu.split('\n').flatMap((texte, index) => {
    if (/^\s*#/.test(texte)) return [];
    const nom = /^\s*(?:export\s+)?([^\s=]+)\s*=/.exec(texte)?.[1];
    return nom ? [{ ligne: index + 1, nom }] : [];
  });
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

  it('intitule ses tests en anglais comme le reste du produit', () => {
    // Les jeux d'essai d'un test sont du français légitime, son intitulé non.
    const fautes = produit()
      .filter((chemin) => EST_UN_TEST.test(chemin))
      .flatMap((chemin) =>
        intitules(lire(chemin))
          .filter(intituleFrancais)
          .map((intitule) => `${chemin} → ${intitule}`),
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

  it('porte chaque colonne du schéma au dictionnaire des données', () => {
    // Le dictionnaire est dérivé du schéma, qui fait foi, et c'est lui que le
    // jury lit. Les colonnes que sa section « Conventions » annonce ne pas
    // répéter n'en sont pas absentes : elles y sont déclarées une fois pour
    // toutes, et les réclamer table par table serait crier au loup.
    expect(ecartsDictionnaire(lire(SCHEMA), lire(DICTIONNAIRE))).toEqual([]);
  });

  it("nomme en anglais chaque variable d'environnement", () => {
    // Le nom est du produit. Le commentaire qui le documente est de
    // l'outillage et reste en français, la valeur ne regarde personne — et
    // aucune des deux n'est lue ici.
    const fautes = fichiersEnv().flatMap((fichier) =>
      variablesEnv(lire(fichier)).flatMap(({ ligne, nom }) => {
        const motifs = motsFrancais(nom);
        if (ACCENTS.test(nom)) motifs.push('accentué');
        return motifs.length ? [`${fichier}:${ligne} ${nom} → ${motifs.join(', ')}`] : [];
      }),
    );

    expect(fautes).toEqual([]);
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

  it('relève une route française, qui est la forme qu avait prise la dérive', () => {
    // Celle-ci a survécu au renommage du 05/11 et pointait en plus vers un
    // écran qui n'existe pas.
    expect(motsFrancais('<a routerLink="/mot-de-passe-oublie">')).toEqual([
      'mot',
      'passe',
      'oublie',
    ]);
  });

  it('relève un dossier français dans un chemin', () => {
    expect(motsFrancais('apps/web/src/app/connexion/connexion.ts')).toEqual(['connexion']);
  });

  it('tolère un commentaire qui cite une maquette du dossier', () => {
    // Le dossier de conception est en français : le citer n'est pas dériver.
    expect(motsFrancais('/** US-01 — the screen specified by Connexion.dc.html. */')).toEqual([]);
  });

  it('isole l intitulé d un test de son jeu d essai', () => {
    const extrait = [
      "describe('CampaignSettings', () => {",
      "  it('refuses to activate without a reference', () => {",
      "    const campaign = { name: 'Mastère 2027' };",
    ].join('\n');

    expect(intitules(extrait)).toEqual([
      'CampaignSettings',
      'refuses to activate without a reference',
    ]);
  });

  it('relève un intitulé français que son vocabulaire seul ne trahit pas', () => {
    // Aucun accent, aucun mot métier : il reste `qui`.
    expect(intituleFrancais('accepte des poids qui ne totalisent pas 1 (RG-05)')).toBe(true);
    expect(intituleFrancais('normalises the weights by their sum (RG-05)')).toBe(false);
  });

  it('tolère les mots anglais qui ressemblent à du français', () => {
    expect(motsFrancais('const analysis = analyse(document, modifier, precedent);')).toEqual([]);
  });

  it('lit une colonne sous son nom physique, et écarte les champs de relation', () => {
    const extrait = [
      'model Document {',
      '  id            String   @id @default(uuid()) @db.Uuid',
      '  institutionId String   @map("institution_id") @db.Uuid',
      '  sha256        String   @db.Char(64)',
      '  createdAt     DateTime @default(now()) @map("created_at")',
      '',
      '  /// Un champ de relation ne porte aucune colonne.',
      '  institution Institution       @relation(fields: [institutionId], references: [id])',
      '  analysis    DocumentAnalysis?',
      '',
      '  @@index([sha256])',
      '  @@map("document")',
      '}',
      'model Institution {',
      '  id String @id',
      '  @@map("institution")',
      '}',
      'model DocumentAnalysis {',
      '  documentId String @id @map("document_id")',
      '  @@map("document_analysis")',
      '}',
    ].join('\n');

    // La clé étrangère reste une colonne ; le champ de relation qui la porte,
    // non — avec ou sans `@relation`, c'est son type qui le dit.
    expect(colonnesDuSchema(extrait).filter(({ table }) => table === 'document')).toEqual([
      { table: 'document', colonne: 'id' },
      { table: 'document', colonne: 'institution_id' },
      { table: 'document', colonne: 'sha256' },
      { table: 'document', colonne: 'created_at' },
    ]);
  });

  it('ne lit une colonne du dictionnaire que dans sa première cellule', () => {
    const extrait = [
      '## document_analysis — Résultat des deux niveaux',
      '',
      '| Colonne         | Type            | Oblig. | Description             |',
      '| --------------- | --------------- | ------ | ----------------------- |',
      '| `detected_type` | `document_type` | non    | Type établi au niveau 1 |',
      '',
      '> Les quatre colonnes `override_rationale` et consorts sont décrites ici.',
    ].join('\n');

    // Ni l'énumération citée en cellule de type, ni la colonne citée dans une
    // note : seule la première cellule nomme une colonne.
    expect(colonnesDuDictionnaire(extrait)).toEqual([
      { table: 'document_analysis', colonne: 'detected_type' },
    ]);
  });

  it('honore la convention que le dictionnaire déclare lui-même', () => {
    const extrait = [
      '## Conventions',
      '',
      'Les colonnes `created_at` et `updated_at` sont présentes sur la plupart',
      'des tables sans valeur métier — voir [`ecarts-mcd-mpd.md`](ecarts-mcd-mpd.md).',
      'Elles ne sont pas répétées ci-dessous.',
      '',
      '## institution — Établissement client',
      '',
      '| `id` | UUID | oui | Identifiant |',
    ].join('\n');

    // Le lien vers un autre document n'est pas une colonne, et la convention
    // s'arrête à sa section : `id` est décrit, pas dispensé.
    expect(colonnesParConvention(extrait)).toEqual(['created_at', 'updated_at']);
  });

  it("relève une colonne du schéma que le dictionnaire n'a jamais portée", () => {
    // Le trou qui a vécu des semaines : les colonnes de requalification
    // (RG-10) ajoutées au schéma, jamais reportées au dictionnaire.
    const schema = [
      'model DocumentAnalysis {',
      '  documentId     String        @id @map("document_id")',
      '  detectedType   DocumentType? @map("detected_type")',
      '  overriddenType DocumentType? @map("overridden_type")',
      '  createdAt      DateTime      @default(now()) @map("created_at")',
      '  @@map("document_analysis")',
      '}',
    ].join('\n');

    const dictionnaire = [
      '## Conventions',
      '',
      'Les colonnes `created_at` et `updated_at` ne sont pas répétées ci-dessous.',
      '',
      '## document_analysis — Résultat des deux niveaux',
      '',
      '| `document_id`   | UUID            | oui | Identifiant |',
      '| `detected_type` | `document_type` | non | Type        |',
    ].join('\n');

    // `created_at` manque aussi, et c'est voulu : la convention le dispense.
    expect(ecartsDictionnaire(schema, dictionnaire)).toEqual([
      'document_analysis.overridden_type est au schéma et manque au dictionnaire',
    ]);
  });

  it("relève une colonne du dictionnaire qui n'existe plus au schéma", () => {
    const schema = [
      'model DocumentText {',
      '  documentId String @id @map("document_id")',
      '  content    String',
      '  @@map("document_text")',
      '}',
    ].join('\n');

    const dictionnaire = [
      '## document_text — Texte extrait',
      '',
      '| `document_id` | UUID   | oui | Identifiant     |',
      '| `content`     | texte  | oui | Texte intégral  |',
      '| `word_count`  | entier | oui | Colonne retirée |',
    ].join('\n');

    expect(ecartsDictionnaire(schema, dictionnaire)).toEqual([
      'document_text.word_count est au dictionnaire et pas au schéma',
    ]);
  });

  it("lit le nom des variables d'environnement, jamais leur valeur", () => {
    const extrait = [
      '# --- Ingestion : garde-fous (RG-07) ---',
      "# Taille maximale d'un fichier déposé : ce commentaire reste en français.",
      'INGESTION_MAX_FILE_SIZE_MB=20',
      'DATABASE_URL=postgresql://probo:probo@localhost:5433/probo?schema=public',
      '# RETENTION_JOURS=90',
    ].join('\n');

    // Le commentaire français est toléré, la valeur n'est pas même lue, et une
    // ligne commentée ne déclare rien.
    expect(variablesEnv(extrait)).toEqual([
      { ligne: 3, nom: 'INGESTION_MAX_FILE_SIZE_MB' },
      { ligne: 4, nom: 'DATABASE_URL' },
    ]);
  });

  it('relève un nom de variable français, troisième angle mort de la règle', () => {
    expect(motsFrancais('INGESTION_TAILLE_MAX_FICHIER_MO')).toEqual(['taille', 'fichier']);
    expect(motsFrancais('MISTRAL_MODELE_NIVEAU_1')).toEqual(['modele', 'niveau']);
    expect(motsFrancais('RETENTION_JOURS')).toEqual(['jours']);

    // Les noms anglais qui les ont remplacées passent.
    expect(motsFrancais('INGESTION_MAX_FILE_SIZE_MB')).toEqual([]);
    expect(motsFrancais('MISTRAL_LEVEL_1_MODEL')).toEqual([]);
    expect(motsFrancais('RETENTION_DAYS')).toEqual([]);
  });
});
