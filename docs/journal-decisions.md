# Journal des décisions techniques

Une entrée par décision structurante, écrite **le jour où elle est prise**. Ce fichier alimente directement la section « justification des choix techniques » du dossier professionnel, et évite de reconstituer au mois 6 un raisonnement de cinq mois.

Format : contexte, options envisagées, décision, conséquences.

---

## 2026-08-15 — Stack entièrement TypeScript

**Contexte.** Le README initial prévoyait FastAPI et Python côté serveur, au motif que l'écosystème d'extraction PDF y est plus riche.

**Options.** (a) Split TypeScript / Python. (b) Tout TypeScript.

**Décision.** Tout TypeScript.

**Raison.** L'argument PDF ne tient pas à l'examen : les meilleurs outils d'extraction ne sont pas des librairies mais des binaires — `pdftotext` de poppler et `tesseract` — appelables depuis n'importe quel langage via `child_process`. Apprendre un second langage pour appeler deux exécutables n'est pas justifiable, d'autant que le profil est déjà à l'aise en TypeScript.

**Conséquences.** Un seul écosystème, une seule CI, des types partagés entre le front et l'API via `packages/shared`. En contrepartie, deux lanceurs de tests coexistent (voir plus bas).

---

## 2026-08-15 — Angular plutôt que React

**Contexte.** Le README prévoyait Next.js, puis Vite + React.

**Décision.** Angular, dans sa version actuelle (composants standalone, signals).

**Raison.** Angular est l'outil quotidien en entreprise ; React remonte à deux ans. Effet de bord décisif : NestJS reprend le modèle d'Angular — décorateurs, injection de dépendances, modules — ce qui divise par deux le coût d'apprentissage du back et donne un paradigme unique de bout en bout.

**Conséquences.** Perte de shadcn/ui, qui est React uniquement. Remplacé par Angular CDK + Tailwind : les primitives sans style, habillées à la main. Angular Material écarté, son esthétique s'impose trop au produit.

---

## 2026-08-15 — ARQ puis BullMQ pour la file de tâches

**Contexte.** Celery était prévu à l'origine, puis ARQ après le passage à Python asynchrone.

**Décision.** BullMQ, conséquence du passage à TypeScript.

**Raison.** Un vrai système de file est nécessaire : lots de 200 documents, appels API de plusieurs secondes, besoin de retries et de survie au redémarrage. BullMQ est le standard Node, natif TypeScript.

**Conséquences.** Redis reste dans la stack. Il sert la file, et non un cache — le README ne revendique pas de cache qui n'existe pas.

---

## 2026-08-15 — npm workspaces plutôt que pnpm

**Contexte.** pnpm avait été proposé par réflexe.

**Décision.** npm workspaces.

**Raison.** Le `node_modules` strict de pnpm protège des dépendances fantômes, mais ce risque ne se matérialise pas sur trois packages tenus par une seule personne. npm est livré avec Node : une brique nouvelle en moins.

---

## 2026-08-15 — Compte de service Google plutôt qu'OAuth

**Contexte.** Le README prévoyait « lien Google Drive public ». Aucune école ne partage publiquement un dossier de candidatures.

**Options.** (a) Lien public + clé API. (b) OAuth utilisateur avec le scope `drive.readonly`. (c) Google Picker avec le scope `drive.file`. (d) Compte de service.

**Décision.** Compte de service : l'établissement partage son dossier avec l'adresse du compte de service, comme avec un collègue.

**Raison.** `drive.readonly` est un scope **restricted** chez Google : vérification obligatoire avec audit de sécurité tiers annuel, incompatible avec le calendrier et le budget d'un projet de titre. Le compte de service évite tout flux OAuth : pas d'écran de consentement, pas de refresh tokens à stocker et chiffrer, et un geste que l'administrateur de l'école comprend déjà. Le moindre privilège est explicite, visible dans son interface, et révocable unilatéralement — meilleur argument RGPD qu'OAuth.

**Conséquences.** Une clé JSON à protéger, jamais committée. La faille de cloisonnement associée est traitée par RG-07 : on n'importe jamais depuis un `folderId` reçu en requête, mais depuis une `DriveConnection` préalablement enregistrée.

**Source.** Documentation Google Identity sur la classification des scopes — lecture à verser à la veille anglophone.

---

## 2026-08-15 — Prisma 7 et ses contraintes

**Décision.** Prisma 7, malgré la rupture de configuration.

**Conséquences, toutes non évidentes :**

- L'URL de connexion ne vit plus dans `schema.prisma`. Les commandes de migration la lisent dans `apps/api/prisma.config.ts`, et le client la reçoit via l'adaptateur `@prisma/adapter-pg` construit dans `PrismaService`.
- Le générateur par défaut produit un client **ESM** utilisant `import.meta`, incompatible avec NestJS qui compile en CommonJS. Corrigé par `moduleFormat = "cjs"`.
- Les imports relatifs du client généré portent une extension `.js` que la résolution CommonJS de Jest ne rattache pas aux `.ts`. Corrigé par `importFileExtension = ""`.
- Le client généré est dans `apps/api/src/generated/` : ignoré par Git, régénéré au `postinstall`.

---

## 2026-08-15 — Deux lanceurs de tests, assumé

**Contexte.** Le cadrage annonçait Vitest comme lanceur unique du dépôt.

**Décision.** Vitest pour `packages/shared` et `apps/web`, **Jest pour `apps/api`**.

**Raison.** Angular 22 livre Vitest par défaut, NestJS livre Jest. Faire tourner Vitest sur NestJS suppose un transformateur SWC pour les décorateurs et `emitDecoratorMetadata` — c'est un point de fragilité connu, et la fiabilité des tests prime sur l'élégance d'un lanceur unique.

**Conséquences.** Le cadrage est à corriger sur ce point. `npm test` à la racine lance les trois workspaces indifféremment.

---

## 2026-08-15 — Ports PostgreSQL et Redis décalés

**Décision.** PostgreSQL sur 5433, Redis sur 6380.

**Raison.** Une installation locale de PostgreSQL occupait déjà 5432 sur la machine de développement. Docker publiait bien le conteneur, mais `localhost` résolvait vers l'instance hôte — avec un `P1010: User was denied access on the database` parfaitement trompeur, puisque les identifiants étaient corrects.

**Conséquences.** Documenté dans `.env.example` et dans le README, parce que c'est le genre de piège qui coûte une soirée.
