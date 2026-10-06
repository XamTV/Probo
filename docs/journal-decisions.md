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

> **Suite, 31/08/2026.** Cette décision est devenue sans objet : l'import Drive est sorti du périmètre v1 (voir l'entrée du 31/08). L'entrée est conservée telle quelle — elle est datée, elle a été juste au moment où elle a été prise, et c'est l'analyse qu'elle contient qui a permis de mesurer le coût réel de la fonctionnalité. La mention de RG-07 ci-dessus renvoie à l'**ancienne** RG-07 ; ce numéro porte désormais la décompression défensive.

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

---

## 2026-08-17 — Interface bilingue via Transloco

**Contexte.** Une table de libellés français, `labels-fr.ts`, servait de frontière entre le code anglais et l'interface française. Demande d'aller vers une vraie internationalisation français / anglais.

**Options.** (a) i18n natif d'Angular, avec `@angular/localize` et extraction XLIFF. (b) Transloco. (c) ngx-translate.

**Décision.** Transloco.

**Raison.** L'i18n natif d'Angular est un mécanisme de compilation : un bundle par langue, servis sous des préfixes d'URL distincts, et changer de langue impose de recharger la page. Surtout, il est conçu pour du texte statique de gabarit et se prête mal aux **clés dynamiques** — or nos libellés les plus nombreux sont exactement cela, `documentType.COVER_LETTER` construit à partir d'une valeur d'énumération. Le contourner demanderait un `switch` par énumération. Transloco résout une clé calculée nativement et bascule de langue sans rechargement.

**Conséquences.**

- Les traductions vivent dans `packages/shared/src/i18n/`, pas dans les assets du front, parce que l'export PDF est généré côté serveur et consommera les mêmes chaînes. Un libellé n'est écrit qu'une fois.
- Un chargeur Transloco sur mesure lit le package partagé au lieu de récupérer du JSON en HTTP. Les deux locales sont donc embarquées dans le bundle : quelques kilo-octets à deux langues, un aller-retour HTTP et une étape de copie d'assets en moins. À revoir au-delà de quatre ou cinq langues.
- `LocaleService` porte l'ordre de résolution — choix explicite, préférence navigateur, français — la persistance, et la mise à jour de l'attribut `lang` du document, que le RGAA exige.
- Le remplacement de `labels-fr.ts` est intégral : plus aucune chaîne d'interface ne vit dans le code.

**Réserve à assumer devant le jury.** Aucun utilisateur actuel n'a besoin de l'anglais : la cible est constituée d'équipes d'admission françaises. Le coût réel est que chaque texte doit être écrit deux fois, pour toujours. Ce qui le justifie : la séparation stricte du texte et du code, et la possibilité d'exporter le produit hors de France sans reprise.

---

## 2026-08-31 — L'archive ZIP comme unique canal d'ingestion

**Contexte.** Le périmètre portait deux chemins d'import : l'archive ZIP (M-03) et le dossier Google Drive par compte de service (M-14), ce dernier ayant déjà fait l'objet de deux entrées de ce journal et d'une règle de gestion dédiée.

**Options.** (a) Conserver les deux canaux. (b) Ne garder que le ZIP, l'import Drive étant reporté après le titre.

**Décision.** ZIP seul. M-14 sort du périmètre v1 et rejoint une nouvelle table de reports datés dans `analyse/perimetre.md`.

**Raison.** Le besoin utilisateur derrière M-14 était « ne pas manipuler de fichiers ». Or un dossier Drive se télécharge en archive ZIP en deux clics, depuis l'interface que Claire utilise déjà tous les jours : M-03 couvre le besoin, moins confortablement, mais entièrement.

Ce qui a fait pencher la balance est le coût **complet** du second canal, qui n'est pas l'appel d'API :

- une entité `DriveConnection` et son écran d'administration ;
- le cloisonnement multi-locataire à démontrer sur un chemin de plus — c'était toute la raison d'être de l'ancienne RG-07 ;
- l'export des Google Docs natifs, format que le reste de la chaîne ne sait pas traiter ;
- une clé de compte de service à protéger, faire tourner et documenter en production ;
- un mode de panne supplémentaire, entièrement hors de notre contrôle : quota, partage révoqué, dossier déplacé.

Rapporté à une marge de vingt heures sur 277, ce n'est pas finançable sans prendre sur le durcissement ou sur le jeu d'essai — c'est-à-dire sur ce qui est évalué.

**Le raisonnement s'inverse aussi côté client.** L'entrée du 15/08 justifiait le compte de service par la contrainte de Marc : sa DSI refuse de connecter un compte Google à une application tierce. Le même argument, poussé d'un cran, dit que **ne demander aucune connexion du tout** est encore plus simple à faire accepter. Le dépôt d'archive ne crée aucun lien permanent entre le système d'information de l'école et Probo. C'est un argument de vente autant qu'une simplification technique.

**Conséquences.**

- **Schéma.** Suppression de `DriveConnection`, de `ImportBatch.driveConnectionId`, du champ `source` et de l'énumération `ImportSource` — migration `20260831101741_zip_only_ingestion`. Le champ `source` n'est pas conservé « au cas où » : une colonne qui ne peut porter qu'une valeur ne renseigne rien, et la réintroduire en v2 coûte une ligne de migration. Même principe que pour Redis en août : le dépôt ne revendique pas ce qui n'existe pas. `ImportBatch.archiveName` la remplace et porte une information réelle pour la piste d'audit.
- **RG-07 est réécrite, pas supprimée.** Elle portait l'origine d'un import Drive ; elle porte désormais la décompression défensive — confinement du chemin résolu, rejet des entrées non régulières, liste blanche de types, plafonds de taille et de rapport de décompression. Le numéro est stable parce qu'il est cité dans le dossier, et le volet sécurité de la soutenance y gagne : la règle devient **testable**, ce que l'ancienne n'était pas.
- **La surface d'attaque de l'ingestion se concentre au lieu de se réduire.** C'est le point à ne pas maquiller devant le jury. Un canal unique, entièrement alimenté par un fichier que l'utilisateur contrôle, mérite plus d'attention que deux canaux tièdes : d'où le durcissement de RG-07 et les nouveaux plafonds `INGESTION_*`.
- **US-08, US-09 et CU-11 sont conservées, marquées hors périmètre v1.** L'analyse est faite et reste valable ; une US barrée documente un arbitrage, une US effacée le dissimule.
- **`M-14` n'est pas réattribué.** `M-15` reste `M-15`, sans quoi les user stories qui le citent désigneraient silencieusement l'export PDF.
- **La veille anglophone n'y perd rien, au contraire.** La recherche sur les scopes Google a désormais motivé deux décisions successives — le compte de service, puis l'abandon. Une lecture technique qui débouche sur un arbitrage de périmètre est un meilleur exemple qu'une lecture qui débouche sur une ligne de code.

**Ce qu'il faut assumer.** M-14 était classé « doit être fait », avec la mention « facteur d'adoption réel ». Le retirer est un recul de périmètre, pas une optimisation. Il est daté, motivé et tracé plutôt que dilué — mais c'est bien un renoncement, et il sera présenté comme tel.

---

## 2026-09-03 — Deux trous au cœur du produit, révélés par le maquettage

**Contexte.** Le maquettage des seize écrans a mis au jour deux manques que cinq mois de documentation n'avaient pas fait apparaître. Ils ne relèvent ni du dessin ni de l'ergonomie : ce sont des trous de conception, et ils touchent le cœur de la proposition de valeur.

C'est exactement l'effet attendu de l'étape — `docs/README.md` prévoyait que « les maquettes modifient toujours le modèle ». Elles l'ont fait plus profondément que prévu.

---

### Premier trou — le niveau 2 n'avait aucun référentiel de comparaison

**Le constat.** Le cahier des charges annonce que le niveau 2 répond à « ce document répond-il **aux critères de la campagne** ? ». Aucune user story ne définissait ces critères. US-06 s'arrêtait au seuil de confiance et aux trois poids. L'entité `Criterion` — `KEYWORD`, `REQUIRED_LEVEL`, `LANGUAGE` — existait dans le schéma sans être rattachée à un seul besoin, et les critères libres étaient classés `C-01`, « pourrait être fait ».

Autrement dit : la fonctionnalité centrale du produit comparait des documents à un référentiel qui n'était spécifié nulle part.

**Options.** (a) Des critères structurés saisis — mots-clés, niveau requis, langue. (b) Un référentiel textuel décrivant le profil recherché. (c) Un document de référence déposé. (d) Les formes (b) et (c) au choix.

**Décision.** (d), avec **un référentiel par type de document attendu** — RG-08, M-16, US-22. L'entité `Criterion` et son énumération sont supprimées ; `ReferenceProfile` les remplace.

**Raison.** Les deux formes servent deux réalités. Rédiger un profil est plus rigoureux et n'exige aucun fichier ; déposer un document existant est le geste naturel d'un établissement qui a déjà une fiche de formation. Refuser l'un des deux aurait imposé une conversion manuelle sans bénéfice.

Un référentiel **par type** et non un par campagne : on n'évalue pas une lettre de motivation sur les attendus d'un CV. Un référentiel transverse rendrait le sous-score d'adéquation flou à expliquer — exactement le défaut que le produit reproche aux outils concurrents.

**Réserve, à porter en soutenance.** Le référentiel doit décrire un **profil recherché**, à la manière d'une fiche de poste. Y déposer le CV d'un candidat réellement admis reviendrait à mécaniser un biais — école d'origine, parcours, âge implicite — dans un contexte d'admission où c'est juridiquement sensible. L'interface l'avertit au moment du dépôt. **Le produit ne peut pas l'empêcher techniquement**, et prétendre le contraire serait malhonnête. C'est une limite assumée, pas une lacune ignorée.

**Conséquence sur `Criterion`.** Sa suppression applique la même règle que la purge du premier MCD : une entité qu'aucun besoin documenté ne justifie n'a pas sa place. À la question « d'où sort cette entité ? », la seule réponse aurait été « d'une conversation ».

---

### Second trou — le regroupement par candidat se contredisait lui-même

**Le constat.** US-07 et CU-04 déduisaient la candidature de l'arborescence de l'archive ou du préfixe du nom de fichier. `Application.candidateName` était une colonne obligatoire dont aucun livrable ne disait l'origine.

Or **le produit tout entier repose sur le fait que les noms de fichiers mentent.** Le premier paragraphe du README le dit : un portfolio glissé à la place d'un CV. Le niveau 1 lit le contenu précisément parce que l'apparence n'est pas fiable. Et pour l'identité — à qui appartient ce document — on faisait au nom de fichier une confiance aveugle.

**Pourquoi c'est plus grave qu'un type mal détecté.** L'erreur n'est pas symétrique. Un type mal classé marque **un** document, visiblement, et RG-01 à RG-03 le rattrapent. Un regroupement erroné **corrompt silencieusement deux scores** : le candidat A hérite d'un document de B, les deux moyennes sont fausses, et rien ne le signale. C'est le faux négatif invisible — le cas que les personas désignent comme celui qui ferait abandonner l'outil.

**Le repli documenté n'en était pas un.** L'extension `6a` du CU-04 prévoyait « aucun regroupement déductible → une candidature par fichier ». À 1 248 documents, cela produit 1 248 candidatures d'un document. Ce n'est pas une dégradation gracieuse, c'est un échec silencieux présenté comme un comportement.

**Décision.** L'identité est lue **dans le texte du document**, comme le type — RG-09, M-17, US-23. Le nom de fichier et l'arborescence deviennent des indices, plus des autorités. Quand les deux se contredisent, quand la confiance est insuffisante, ou en cas d'homonymie, le lot passe au statut `AWAITING_RECONCILIATION` et **aucune analyse de niveau 2 ne démarre** avant arbitrage humain.

**Conséquences sur le modèle.**

- `Document` porte `detectedCandidateName` et `detectedNameConfidence`.
- `Application` porte `identitySource` — `FOLDER`, `FILENAME`, `CONTENT` ou `MANUAL`. Un regroupement doit rester explicable et contestable, au même titre qu'un score.
- `ImportBatchStatus` gagne `AWAITING_RECONCILIATION`.
- Un écran de réconciliation s'ajoute au lot de maquettes, entre l'import et le classement.

**Ce que cela coûte.** Un appel supplémentaire au modèle par document, ou une extraction d'identité greffée sur l'appel de niveau 1 — à trancher à l'implémentation. Et une étape humaine de plus dans un parcours qu'on voulait sans friction. C'est le prix d'un classement dont les regroupements sont défendables ; un classement rapide et faux ne vaut rien.

---

**Ce que ces deux entrées disent de la méthode.** Le maquettage n'a pas produit que des écrans : il a produit deux règles de gestion, deux entrées de périmètre, deux user stories et une refonte partielle du schéma. C'est l'argument à donner au jury sur la chaîne `besoins → US → CU → maquettes → MCD` — la preuve, par l'exemple, que faire le MCD avant les maquettes aurait obligé à le refaire.

---

## 2026-10-05 — Trois points en suspens, tranchés ensemble

**Contexte.** Trois décisions traînaient depuis le maquettage, chacune signalée mais aucune arbitrée. Les traiter séparément aurait coûté trois séances ; elles touchent toutes les trois à la même question — ce que le produit garantit, et ce qu'il laisse au code.

---

### Claire doit pouvoir contredire l'outil — RG-10, M-18, US-24

**Le constat.** `personas.md` l'écrit en toutes lettres : Claire « acceptera un outil qui ordonne et justifie, pas un outil qui tranche », et « elle doit pouvoir contredire l'outil ». Or US-11 comptait six critères d'acceptation, **tous passifs** : le motif est affiché, le document est écarté, le signalement est visible partout. Aucune action. Aucun recours.

Probo tranchait.

**Options.** (a) Étendre la file de réconciliation. (b) Un geste sur le détail du document. (c) Reporter en `S-xx`.

**Décision.** (b), dans une portée volontairement minimale.

**Raison, et correction d'une erreur antérieure.** J'avais d'abord proposé d'étendre l'écran de réconciliation. C'était le mauvais endroit : cet écran **bloque** l'analyse, alors qu'un document atypique ne bloque rien — il est déjà visible, déjà exclu, déjà expliqué. Le bon endroit est le détail du document, là où Claire lit la justification qu'elle conteste.

L'asymétrie est la même qu'entre RG-09 et RG-10 : un doute d'identité corrompt deux scores en silence, donc il bloque ; un verdict d'atypie est bruyant et sans conséquence cachée, donc il attend.

**Le verdict du modèle n'est jamais écrasé.** C'est le point structurant. `detectedType`, `confidence` et `isAtypical` gardent ce que le modèle a dit ; quatre colonnes enregistrent la décision humaine à côté. Écraser aurait rendu le produit muet devant la seule question qui compte en cas de contestation : qui a décidé ?

**`UNREADABLE` fait exception et n'est pas contredisible.** Les deux autres motifs portent sur un jugement, qu'un humain tranche mieux. Celui-ci ne porte sur aucun jugement : il n'y a pas de texte. Offrir un bouton qui ne peut rien changer serait mentir sur ce que l'outil sait faire.

**Ce qui reste dehors.** La relance en OCR dépend de `S-01`, et la requalification de masse toucherait des scores déjà calculés. Les deux restent hors périmètre.

---

### Le vocabulaire du journal d'audit devient une énumération

**Le constat.** `audit_entry.action` et `entity_type` étaient des chaînes libres. Les maquettes affichent pourtant « Entrée d'archive refusée », « Purge automatique » — des libellés stables et traduits.

**Décision.** Deux énumérations PostgreSQL : 16 actions, 8 types de ressource.

**Raison.** La règle du projet veut qu'aucune valeur brute n'atteigne un écran. Une chaîne libre garantit l'inverse : l'interface aurait affiché `BATCH_IMPORTED` ou se serait appuyée sur une table de correspondance qu'aucun type ne protège. Le jeu est borné et connaissable — les cas d'utilisation le donnent presque en entier.

**Le prix, assumé.** Une migration à chaque nouvelle action journalisée. C'est le coût d'un vocabulaire que la base garantit, et il est payé une fois par ajout plutôt qu'à chaque lecture.

**Conséquence.** Les deux énumérations existent aussi dans `packages/shared` et portent leurs clés de traduction, comme toutes les autres.

---

### RG-08 cesse de reposer sur le seul code

**Le constat.** RG-08 exige qu'un référentiel porte exactement une de ses deux formes. Prisma ne génère pas de contrainte `CHECK` : la règle ne vivait que dans le code applicatif. C'était l'écart n°10, le **seul** de la liste qualifié de faiblesse plutôt que de choix.

**Décision.** Une contrainte `CHECK` écrite à la main, dans sa propre migration.

**Raison.** Une règle tenue par le seul code se contourne — par un script de reprise, un correctif en production, un second appelant. Une contrainte ne se contourne pas. Vérifié : les deux formes simultanées et l'absence de forme sont refusées, chaque forme seule est acceptée.

**Le prix.** `schema.prisma` ne décrit plus toute la base. Une relecture du seul schéma manquerait cette contrainte, d'où sa mention au MPD, aux écarts et au dictionnaire.

---

**Ce que ces trois décisions ont en commun.** Chacune déplace une garantie du code vers une structure — le verdict humain vers des colonnes, le vocabulaire d'audit vers une énumération, RG-08 vers une contrainte. Le code reste nécessaire ; il n'est plus le seul rempart.

---

## 2026-10-05 — Dissolution du prompt de maquettage

**Contexte.** `maquettage/prompt-claude-design.md` était le cahier des charges rédigé pour produire les écrans. Les écrans sont produits depuis un mois, et le document était toujours entretenu — j'ai encore mis à jour sa description de l'écran 3 le jour même, par réflexe.

**Le constat, chiffré.** 142 de ses 282 lignes décrivaient les écrans un par un. C'est une redescription de ce que les 19 artboards montrent mieux, et une seconde vérité à tenir : toute modification d'écran demandait de toucher les deux.

C'est exactement le motif refusé trois fois ce même jour — pour les images rendues, pour un document de MPD, pour le canvas assemblé. Il n'avait pas été appliqué ici parce que personne, moi compris, n'avait reposé la question de l'utilité du document une fois son but atteint.

**Options.** (a) Le geler, daté, comme preuve de méthode. (b) Le dissoudre dans les livrables qui restaient à produire. (c) Le supprimer sèchement.

**Décision.** (b).

**Raison.** L'autre moitié du document n'était pas morte, elle était **mal rangée**. Direction visuelle, vocabulaire et contraintes techniques sont une charte graphique ; la section accessibilité est une position RGAA. Or `charte-graphique.md` et `accessibilite-rgaa.md` figuraient tous deux à l'index comme « à produire ». Ils étaient déjà écrits, au mauvais endroit, dans un document dont la raison d'être était épuisée.

Le gel se défendait — montrer le cahier des charges qui a engendré les écrans est une preuve de méthode. Mais un document figé qui contredit les écrans actuels devient un passif, et les cinq problèmes de conception qu'il portait sont mieux placés dans le README du maquettage, où ils servent encore à juger les écrans.

**Conséquences.**

- La charte graphique est **extraite des artboards**, pas rédigée de mémoire : couleurs relevées par fréquence d'usage, échelle de tailles réelle, trois graisses, inventaire des composants. Elle porte sa règle de tenue — en cas de divergence, ce sont les artboards qui ont raison.
- La position RGAA distingue ce que les maquettes **démontrent** de ce qu'elles ne peuvent pas démontrer : le parcours clavier, le piège de focus et le contraste mesuré demandent l'application réelle, et rejoignent le plan de tests. Elle acte aussi qu'aucune déclaration de conformité ne sera produite — la revendiquer sans audit serait invérifiable.
- Deux livrables « à produire » sont cochés, 142 lignes de doublon disparaissent, et il n'y a plus qu'une description des écrans : les écrans.

**Ce que ça dit de la méthode.** Un livrable a une fin de vie. Celui-ci avait rempli son office et continuait d'être entretenu par habitude — c'est le même mécanisme qui produit un MCD divergent au bout de cinq mois.

---

## 2026-10-06 — Livraison par lots, une branche par lot

**Contexte.** Huit commits, tous poussés directement sur `main`. La CI se déclenche pourtant déjà sur `pull_request` autant que sur `push: main` — elle était prête pour un flux par branches, et n'en servait que la moitié. Aucun document ne disait non plus dans quel ordre livrer les vingt-quatre user stories.

**Options.** (a) Continuer en direct sur `main`. (b) Une branche par user story. (c) Une branche par lot de livraison.

**Décision.** (c), avec sept lots définis dans `analyse/plan-livraison.md`.

**Raison.** L'ordre n'est pas une préférence, il est imposé par des dépendances : rien n'est testable sans authentification et cloisonnement, un import vise une campagne, le niveau 2 compare à un référentiel, la réconciliation s'intercale entre les deux niveaux d'analyse. Écrire ces dépendances était nécessaire indépendamment du flux Git — elles n'existaient que dans une conversation.

Vingt-quatre branches pour un développeur seul seraient de la cérémonie. Le lot regroupe ce qui se teste ensemble et n'a pas de sens séparément.

**Ce que la pull request apporte, et ce qu'elle n'apporte pas.** Pas la revue : se relire par principe, seul, est du théâtre. Elle apporte la CI **avant** la fusion plutôt qu'après, un endroit pour décrire le lot, et un historique qui montre une méthode — ce qu'un jury regarde.

**Ce que ça ne doit pas devenir.** Pas de `develop`, pas de GitFlow, pas de branche par commit. `main` plus une branche de lot vivante. La seule règle non négociable : `main` reste déployable.

**Conséquences.**

- Les vingt-quatre user stories sont ouvertes comme issues GitHub, groupées par jalon de lot, étiquetées par épopée. **Les documents font foi, pas les issues** — une issue est une copie de confort, et elle divergera.
- Le script d'amorçage qui les a créées n'est pas versionné. Il contenait une copie des user stories, donc une troisième vérité, et son travail est fait. L'information durable — le découpage en lots — est dans le plan de livraison, pas dans un script shell.
- Un lot n'est fini que lorsque les livrables de conception qu'il périme sont à jour dans la même séance. C'est le point qu'on saute sous pression, et celui qui produit un dossier reconstitué de mémoire au mois six.

**Ce qu'il faut assumer.** Ce cadrage arrive à sept semaines du démarrage, alors que l'application expose encore une seule route. Il ne rattrape pas ce retard — il évite seulement de pousser du rouge sur `main` pendant les quatorze semaines qui restent.
