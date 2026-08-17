# Probo

> La preuve, document par document.

Probo est un SaaS B2B qui analyse en masse les candidatures reçues par les écoles et organismes de formation. Pour chaque fichier uploadé, il répond à deux questions dans l'ordre : est-ce bien le bon type de document ? et à quel point correspond-il aux critères de la campagne ? Le résultat est un classement candidat clair, où les fichiers suspects sont signalés avant tout calcul.

---

## Le problème

Les responsables d'admission reçoivent des centaines de candidatures par campagne. Le tri manuel est chronophage, biaisé par la fatigue, et peu traçable. À cela s'ajoute un problème souvent ignoré : les dossiers contiennent régulièrement des fichiers mal constitués — un portfolio glissé à la place d'un CV, une lettre de recommandation confondue avec une LM, un PDF illisible. Ces erreurs biaisent les classements quand elles ne sont pas détectées.

## La solution

Probo ingère un lot de documents (ZIP ou dossier Google Drive) et effectue pour chaque fichier une **analyse à deux niveaux**.

**Niveau 1 — Vérification de la nature.** L'IA classifie chaque document : CV, lettre de motivation, lettre de recommandation, portfolio, autre. Elle attribue un score de confiance (0-100 %). Si la confiance est insuffisante ou le type inattendu, le document est marqué **atypique** et signalé explicitement — il n'entre pas dans le calcul de score.

**Niveau 2 — Adéquation à la campagne.** Pour les documents validés au niveau 1 uniquement, l'IA évalue l'adéquation aux critères de la campagne et produit trois sous-scores : adéquation, clarté, qualité formelle. Chaque score est accompagné d'une justification textuelle.

Les documents sont ensuite regroupés par candidat. L'utilisateur consulte un classement agrégé, peut zoomer sur chaque candidature, et voir le détail de chaque fichier avec son double niveau d'analyse.

## Pourquoi cette approche

La plupart des outils de scoring de candidatures scorent tout ce qu'on leur donne, même un fichier mal nommé ou hors-sujet. Probo sépare deux jugements distincts : _« c'est quoi ce document »_ et _« est-il pertinent »_. Cette séparation est la garantie que le classement final repose sur des données fiables.

---

## Démarrage

Prérequis : Node 22 (voir `.nvmrc`), Docker, et les binaires d'extraction PDF.

```bash
# Binaires d'extraction (macOS)
brew install poppler tesseract tesseract-lang

# Dépendances
npm install

# Configuration
cp .env.example .env
openssl rand -base64 48        # à coller dans JWT_SECRET

# Infrastructure locale
npm run infra:up               # PostgreSQL sur 5433, Redis sur 6380
npm run db:migrate

# Lancement
npm run dev                    # API sur :3000, front sur :4200
```

Vérification : `curl http://localhost:3000/api/health` doit répondre `{"status":"ok","database":"ok",...}`.

> **Ports décalés.** PostgreSQL écoute sur **5433** et Redis sur **6380**, pas sur leurs ports standard. Une installation locale de PostgreSQL occupe généralement 5432, et `localhost` taperait dessus plutôt que sur le conteneur — avec un `P1010: User was denied access` très trompeur à la clé.

### Commandes

| Commande             | Effet                                  |
| -------------------- | -------------------------------------- |
| `npm run dev`        | API et front en watch, en parallèle    |
| `npm test`           | Tests des trois workspaces             |
| `npm run lint`       | ESLint sur l'API et le front           |
| `npm run format`     | Prettier en écriture sur tout le dépôt |
| `npm run build`      | Build ordonné : shared → api → web     |
| `npm run infra:up`   | Démarre PostgreSQL et Redis            |
| `npm run infra:down` | Arrête les conteneurs                  |
| `npm run db:migrate` | Applique et crée les migrations Prisma |
| `npm run db:studio`  | Ouvre Prisma Studio                    |

---

## Architecture

```
[Front Angular]
      ↓ API REST (même domaine, /api)
[NestJS]
      ↓ 1 job BullMQ par document
[Workers]
      ↓
[Mistral API]  →  Niveau 1 : classification du type
               →  Niveau 2 : scoring d'adéquation (si N1 valide)
      ↓
[PostgreSQL + Redis + stockage disque]
```

Chaque document est traité indépendamment par un job dédié. La candidature est mise à jour une fois tous ses documents analysés. Cette approche permet la parallélisation native, la résilience aux pics de charge, et une traçabilité fine par fichier.

### Organisation du dépôt

```
apps/api        NestJS — API REST, workers, accès aux données
apps/web        Angular — tableau de bord et drill-down
packages/shared Schémas Zod, types métier et règles de gestion
docs/           Conception, cadrage, décisions techniques
```

`packages/shared` est le contrat commun : une seule définition des types de documents, des schémas de sortie du modèle, des règles de gestion et des traductions — consommée par l'API comme par le front.

### Internationalisation

L'interface est disponible en français et en anglais. Les fichiers de traduction vivent dans [`packages/shared/src/i18n/`](packages/shared/src/i18n/) plutôt que dans les assets du front, pour une raison précise : **l'export PDF est généré côté serveur**. Si les libellés n'existaient que dans le front, chacun serait écrit deux fois et les deux versions divergeraient.

Trois conséquences :

- Les valeurs d'énumération sont traduites par leur clé — `documentType.COVER_LETTER` — donc ajouter un type de document ne demande de toucher aucun composant.
- Le choix de langue est résolu dans cet ordre : choix explicite de l'utilisateur, puis préférence du navigateur, puis français. Il est conservé en `localStorage`.
- L'attribut `lang` du document suit la langue active. Ce n'est pas cosmétique : les lecteurs d'écran en tirent leur prononciation, et le RGAA exige que la langue de la page soit déclarée.

Les deux locales sont embarquées dans le bundle plutôt que chargées à la demande. À deux locales cela coûte quelques kilo-octets et évite un aller-retour HTTP ; à revoir au-delà de quatre ou cinq langues.

---

## Stack

| Couche           | Technologie                                    |
| ---------------- | ---------------------------------------------- |
| Langage          | TypeScript, front et back                      |
| Front            | Angular · Tailwind CSS · Angular CDK           |
| Backend          | NestJS                                         |
| Base de données  | PostgreSQL · Prisma                            |
| File de tâches   | BullMQ · Redis                                 |
| Validation       | Zod, partagé front et back                     |
| Extraction PDF   | `pdftotext` (poppler) · `tesseract` en secours |
| IA               | Mistral AI                                     |
| Export PDF       | pdfmake                                        |
| Authentification | Argon2 · JWT en cookie httpOnly                |
| i18n             | Transloco — français et anglais                |
| Tests            | Vitest (front, shared) · Jest (API)            |
| Infrastructure   | Docker · GitHub Actions · VPS Scaleway         |

### Choix de Mistral AI

Mistral est une société française dont les serveurs sont hébergés en Europe. Les données candidats ne quittent jamais l'UE, ce qui élimine le risque lié au Cloud Act américain et simplifie la conformité RGPD pour les établissements clients.

Deux modèles sont utilisés : `mistral-small-latest` pour la classification du type (rapide, économique) et `mistral-large-latest` pour le scoring d'adéquation (précis, justifications de qualité).

### Extraction PDF par binaires

Les meilleurs outils d'extraction ne sont pas des librairies mais des exécutables : `pdftotext -layout` surpasse la plupart des bibliothèques et s'installe en une ligne dans le Dockerfile. Ils sont appelés via `child_process`, ce qui évite d'introduire un second langage dans la stack pour cette seule raison.

---

## Modèle de données

L'entité centrale est `Document`, pas `Application` — la candidature. Chaque document porte sa propre `DocumentAnalysis` (relation 1-1), qui contient le résultat des deux niveaux d'analyse. `Application` est un agrégat : elle regroupe les documents et calcule un score global à partir des scores validés.

```
Institution ─┬─ User
             ├─ DriveConnection
             └─ Campaign ─┬─ Criterion
                          ├─ ImportBatch
                          └─ Application ── Document ─┬─ DocumentText
                                                      └─ DocumentAnalysis
```

> **Langues.** Le code, la base et l'API sont en anglais ; le dossier professionnel est en français. L'interface est **bilingue français / anglais** via [Transloco](#internationalisation). Les identifiants de règles `RG-xx` restent identiques des deux côtés : ce sont des clés de traçabilité, pas de la prose.

Le modèle physique vit dans [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma). Le MCD Merise correspondant sera établi après les maquettes — voir [docs/README.md](docs/README.md) pour la chaîne de dépendance des livrables de conception.

Trois décisions à connaître :

- **Le rang n'est pas stocké.** Il se calcule par fonction fenêtre à la lecture. Un rang matérialisé s'invaliderait à chaque document analysé.
- **Un score de candidature vaut `null`, jamais zéro,** quand aucun document n'est exploitable. Zéro signifierait « mauvaise candidature » et la classerait en dernier ; `null` signifie « rien à évaluer ».
- **`promptVersion` est stockée sur chaque analyse.** Sans elle, impossible d'expliquer pourquoi le même document a obtenu deux scores différents à deux semaines d'écart.

## Règles de gestion

Les règles métier sont implémentées et testées dans [`packages/shared/src/business-rules.ts`](packages/shared/src/business-rules.ts). Chacune porte un identifiant stable, repris dans les noms de tests et dans le dossier professionnel.

| Règle | Énoncé                                                                                        |
| ----- | --------------------------------------------------------------------------------------------- |
| RG-01 | Confiance N1 sous le seuil de la campagne → document atypique                                 |
| RG-02 | Type détecté hors des types attendus → document atypique                                      |
| RG-03 | Texte non extractible → document atypique, motif `ILLISIBLE`, sans appel au modèle            |
| RG-04 | Le niveau 2 n'est exécuté que sur les documents non atypiques                                 |
| RG-05 | Score document = moyenne pondérée des trois sous-scores, poids définis par la campagne        |
| RG-06 | Score candidature = moyenne des documents retenus ; `null` si aucun n'est exploitable         |
| RG-07 | Un import Drive ne cite qu'une `DriveConnection` enregistrée, jamais un `folderId` de requête |

---

## Sécurité

Trois points structurants, détaillés dans le plan de sécurisation (`docs/securite/`) :

- **Cloisonnement multi-locataire.** `institutionId` est dénormalisé jusqu'aux tables profondes pour que tout filtre de cloisonnement tienne en une clause et reste auditable.
- **RG-07 et la référence directe non sécurisée.** Le compte de service Google voit tous les dossiers qu'on lui a partagés, tous établissements confondus. Accepter un identifiant de dossier fourni par le client ouvrirait une fuite entre locataires : l'import ne part que d'une connexion préalablement enregistrée.
- **Secrets.** La clé du compte de service Google et le `.env` ne sont jamais committés — voir `.gitignore`.

## RGPD

Suppression automatique des candidatures après 90 jours (`purgeDueAt`, indexée pour le balayage quotidien), droit à l'oubli, et journal d'audit. Le journal est rattaché à l'établissement et non à la candidature : la purge des candidatures laisse donc la piste d'audit intacte.

---

## Auteur

**Maxime Maussion-Gautheron** — Projet réalisé dans le cadre du titre professionnel Concepteur Développeur d'Applications (TP-01281, niveau 6 RNCP), 2026.
