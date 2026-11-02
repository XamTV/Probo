# Probo — instructions de travail

Projet de titre professionnel CDA. Le dépôt porte une application **et** un dossier de conception : les deux sont évalués, et ils doivent rester cohérents entre eux.

**À lire avant de travailler sur la conception :** [`docs/README.md`](docs/README.md) porte la chaîne de dépendance des livrables et l'état d'avancement. [`docs/journal-decisions.md`](docs/journal-decisions.md) explique pourquoi la stack est ce qu'elle est. Le [README](README.md) porte l'architecture, la stack et le démarrage — ne pas les recopier ici.

## Langues — la règle la plus facile à enfreindre

Le code, la base et l'API sont en **anglais**. Le dossier de conception est en **français**. L'interface est **bilingue** via Transloco.

- Aucune chaîne d'interface ne vit dans le code. Tout passe par une clé de traduction, dans `packages/shared/src/i18n/` — jamais dans les assets du front, parce que l'export PDF est généré côté serveur et consomme les mêmes chaînes.
- Les valeurs d'énumération sont traduites par leur clé (`documentType.COVER_LETTER`). Ajouter un type ne doit demander de toucher aucun composant.
- **Quand un énum change, les documents qui le citent changent dans la même séance.** Une valeur d'énumération citée entre backticks dans un document est une référence au code : elle s'écrit exactement comme dans `packages/shared/src/enums.ts`, en anglais. Les majuscules françaises sans backticks du prompt de maquettage sont de l'emphase, pas des identifiants — elles ne suivent pas cette règle.

## Identifiants — stables, jamais réattribués

`RG-xx` (règles), `M-xx` / `S-xx` / `C-xx` (périmètre), `US-xx`, `CU-xx` sont des clés de traçabilité citées dans le dossier.

**Ne jamais renuméroter, ne jamais réattribuer un identifiant libéré.** Un identifiant retiré laisse un trou, documenté sur place. `M-14` est vacant depuis l'abandon de l'import Drive : le combler ferait pointer silencieusement les US qui citent `M-15` vers une autre fonctionnalité.

Réécrire l'énoncé porté par un identifiant est possible, mais s'annonce : voir la section « Historique » de RG-07.

## Journal de décisions

Toute décision structurante donne lieu à une entrée dans `docs/journal-decisions.md`, **le jour où elle est prise**, au format contexte / options / décision / raison / conséquences.

Les entrées passées ne se réécrivent pas : une décision devenue caduque reçoit un renvoi daté, elle n'est pas corrigée après coup.

Ne pas y verser les changements mineurs. Le journal vaut par sa densité.

## Ordre des livrables de conception

**besoins → user stories → cas d'utilisation → maquettes → MCD.** Ne pas produire le MCD avant les maquettes : dessiner les écrans révèle des attributs manquants, et un MCD antérieur est un MCD à refaire. Une première version a déjà été supprimée pour cette raison.

Le MCD se met à jour **dans la même séance** que la migration Prisma correspondante.

## Ne pas documenter ce qui n'existe pas

Le dépôt ne revendique aucune capacité non implémentée, et le schéma ne porte aucune colonne sans information — une colonne à valeur unique est supprimée plutôt que conservée « au cas où ». Réintroduire coûte une migration ; mentir au jury coûte plus cher.

## Pièges techniques

- **Prisma 7.** L'URL de connexion n'est pas dans `schema.prisma` mais dans `apps/api/prisma.config.ts`. Le client généré vit dans `apps/api/src/generated/`, n'est pas committé, et se régénère au `postinstall`. Ne pas toucher aux options `moduleFormat` et `importFileExtension` du générateur : elles corrigent deux incompatibilités avec NestJS et Jest, expliquées au journal.
- **Deux lanceurs de tests, assumé.** Jest pour `apps/api`, Vitest pour `apps/web` et `packages/shared`. `npm test` à la racine lance les trois. Ne pas proposer de les unifier.
- **`npm test` reconstruit `packages/shared` d'abord** (`pretest`). Un test qui échoue sur un type absent vient souvent de là.
- **Ports décalés** — PostgreSQL 5433, Redis 6380. Un `P1010` trompeur signale généralement qu'on tape sur une instance locale plutôt que sur le conteneur.
- **Le pipe de validation va sur le paramètre, jamais sur le gestionnaire.** `@UsePipes` s'applique à **tous** les paramètres : un schéma de corps de requête validerait aussi l'objet de session et en retirerait `institutionId`. Le cloisonnement disparaît alors en silence. Écrire `@Body(new ZodValidationPipe(X))`.
- **Un secret ou une variable d'environnement se lit par `ConfigService`**, dans une fabrique `registerAsync`, jamais par `process.env` au moment de définir un module : ConfigModule n'a pas encore chargé le `.env` à cet instant, et la valeur est vide.
- **Vérifier la plage de pairs et le format de module avant d'ajouter un paquet.** `npm install X` donne la dernière version, qui peut cibler un majeur de Nest supérieur au nôtre et n'exister qu'en ESM — que Jest, en CommonJS, ne sait pas lire.
- **Les tests end-to-end ont besoin de `--experimental-vm-modules`** : Prisma 7 fait un import dynamique à la connexion que la machine virtuelle de Jest refuse sans ce drapeau. Il est dans le script `test:e2e`.

## Vérifications avant de rendre la main

`npm run lint`, `npm test`, et `npm run format` si des fichiers ont été écrits.

## Mode de travail

Cadré le 05/10/2026.

**Sans demander :** écrire et modifier les livrables et le code, lancer tests, lint, build et migrations.

**Toujours s'arrêter pour :** **tout commit**, qui passe par la relecture et l'accord explicite de l'auteur ; pousser sur `origin` ; tout changement de périmètre — une RG, un M-xx, une entité ; toute opération destructrice sur des données.

**Signaler sans bloquer :** les incohérences trouvées en chemin, en fin de message.

**Ces arrêts sont tenus par le harnais, pas par la mémoire.** `.claude/hooks/refus-publication.sh` refuse `git commit`, les poussées sur `origin`, et l'ouverture ou la fusion d'une pull request. Le refus est sans appel : **ces commandes reviennent à l'auteur**, qui les lance lui-même après relecture. Présenter le travail à relire et la commande prête à coller fait partie du travail. Voir les entrées des 08/10 et 02/11/2026 au journal.

Après toute retouche au motif du hook : `npm run test:hook`. Il a produit trois défauts le jour de son installation, dont deux contournements silencieux.

## Branches et livraison

Le découpage en lots, leur ordre et les dépendances qui l'imposent : [`docs/analyse/plan-livraison.md`](docs/analyse/plan-livraison.md). Ne pas le recopier ici.

**Une branche par lot**, `feat/lot-N-slug`. Une pull request vers `main`, fusionnée quand la CI est verte — elle se déclenche sur `pull_request`, c'est tout l'intérêt. Le titre de PR porte les identifiants de périmètre : `feat(api): lot 1 — authentification et cloisonnement (M-01, M-11)`.

**`main` reste toujours déployable.** Pas de `develop`, pas de GitFlow, pas de branche par commit.

Un lot n'est fini que lorsque les critères d'acceptation passent, que ses règles de gestion sont testées sous leur identifiant `RG-xx`, que la CI est verte, et que les livrables de conception qu'il périme sont à jour dans la même séance.

## Commits

Convention `type(scope): sujet en anglais` — `feat`, `refactor`, `docs`, `chore`. Le sujet dit ce qui change pour le projet, pas ce qui change dans les fichiers. Le corps explique le pourquoi, pas le quoi.

L'anglais aligne les messages sur le code et la base ; le dossier de conception reste en français.
