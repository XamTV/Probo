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

## Vérifications avant de rendre la main

`npm run lint`, `npm test`, et `npm run format` si des fichiers ont été écrits.

## Commits

Convention `type(scope): sujet en français` — `feat`, `refactor`, `docs`, `chore`. Le sujet dit ce qui change pour le projet, pas ce qui change dans les fichiers. Ne jamais committer sans demande explicite.
