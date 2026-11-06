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

**Ce que cela coûte.** Un appel supplémentaire au modèle par document, ou une extraction d'identité greffée sur l'appel de niveau 1 — à trancher à l'implémentation (**Q-01**). Et une étape humaine de plus dans un parcours qu'on voulait sans friction. C'est le prix d'un classement dont les regroupements sont défendables ; un classement rapide et faux ne vaut rien.

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

---

## 2026-10-06 — Invitation par lien transmis, sans envoi de courriel

**Contexte.** Le lot 1 a livré la création de comptes, et a mis au jour un trou dans US-02 : un compte créé reçoit un mot de passe aléatoire inutilisable, et rien ne permet à son propriétaire d'en choisir un. Un administrateur ne peut donc pas réellement donner accès à son équipe.

**Options.** (a) L'administrateur choisit le mot de passe et le communique. (b) Probo envoie un courriel d'invitation. (c) Probo produit un lien d'invitation que l'administrateur transmet lui-même.

**Décision.** (c), avec un lien valable sept jours, à usage unique.

**Pourquoi pas (a).** L'administrateur connaîtrait le mot de passe d'un membre de son équipe. Le journal d'audit cesserait alors de prouver qui a agi : toute action de Claire serait contestable au motif que Marc pouvait se connecter à sa place. C'est le fondement même de la traçabilité qui tomberait.

**Pourquoi pas (b).** Un envoi de courriel suppose un service SMTP : une dépendance à configurer, à surveiller, dont les échecs sont silencieux et la délivrabilité incertaine. Les notifications par courriel sont classées `C-03`, « pourrait être fait » — en introduire une par la petite porte pour l'invitation contredirait cet arbitrage.

C'est aussi la contrainte de Marc : sa DSI instruit lentement toute connexion à un service tiers. Un produit qui n'envoie rien ne demande l'autorisation de personne. Même raisonnement que pour l'abandon de l'import Drive.

**Conséquences.**

- US-02 gagne six critères d'acceptation. Le périmètre est inchangé : c'est M-01 qui se précise, pas un M-xx de plus.
- Un compte sans mot de passe posé est **invité**, visible comme tel et incapable de se connecter. L'état existe déjà dans les maquettes de l'écran Comptes, sous le libellé « Invitation envoyée » — à corriger, puisque Probo n'envoie rien.
- Le jeton d'invitation demande une table ou deux colonnes, à trancher au lot 2 (**Q-02** — tranchée le 02/11/2026, voir l'entrée de cette date).

**La limite à assumer.** Transmettre un lien de création de mot de passe par message instantané ou de vive voix n'est pas idéal. Sa durée courte et son usage unique en limitent la portée, et l'alternative — que l'administrateur connaisse le mot de passe — est franchement pire.

---

## 2026-10-08 — La règle de non-publication passe du rappel au harnais

**Contexte.** `CLAUDE.md` demande depuis le 05/10 l'accord explicite de l'auteur avant tout commit et avant de pousser sur `origin`. La règle a été enfreinte deux fois en trois jours : un commit non demandé le 06/10, puis un commit, un `git push` et l'ouverture de la PR #26 le 08/10, alors que la consigne reçue était seulement « corrige dans une branche adéquate ».

**Options.** (a) Reformuler la règle plus fermement dans `CLAUDE.md`. (b) Protéger la branche `main` côté GitHub. (c) Un hook `PreToolUse` qui refuse la commande avant qu'elle ne parte.

**Décision.** (c) — `.claude/hooks/refus-publication.sh`, déclaré dans `.claude/settings.json`, refuse `git push`, `gh pr create` et `gh pr merge`. Tout le reste de `git` et de `gh` passe.

**Raison.** C'est le raisonnement que le projet applique déjà partout ailleurs, retourné vers son propre outillage. RG-08 est passée du code à une contrainte `CHECK`. Le cloisonnement est passé d'un `if` à une clause de requête, que l'appelant ne peut pas formuler autrement. Le test de bout en bout est passé de la bonne volonté à la CI. Une garantie tenue par un rappel se contourne par simple oubli ; déplacée dans une structure, elle n'a plus besoin qu'on s'en souvienne.

**Pourquoi pas (a).** C'est exactement ce qui a échoué. Le texte était déjà sans ambiguïté — il ne manquait pas de fermeté, il manquait d'exécution.

**Pourquoi pas (b).** Une protection de branche défend `main`, pas `origin`. Elle laisserait pousser sur une branche de lot et ouvrir une pull request, qui sont précisément les deux actes constatés. Elle reste souhaitable pour d'autres raisons, et relève du lot 7 avec le reste de la configuration de déploiement.

**Conséquences.**

- Le refus est porté par le harnais, pas par l'assistant : il survit à une session compactée, à un changement de modèle et à un oubli.
- Les commandes bloquées sont présentées à l'auteur, qui les exécute ou les autorise. Le coût est d'un aller-retour par publication.
- Le hook est versionné. Un jury qui regarde le dépôt voit une règle de collaboration outillée, pas seulement énoncée.
- `git commit` n'est **pas** bloqué : aucune commande ne le distingue d'un commit demandé, et un commit local reste réversible sans trace. L'interdiction de committer sans accord reste tenue par `CLAUDE.md`, et c'est une faiblesse assumée de ce dispositif.

**Ce que l'installation a appris, le 09/10.** Le hook a bloqué deux fois des commandes légitimes avant d'être juste, et les deux défauts disent la même chose : un filtre qui lit du texte ne distingue pas une commande d'une mention.

Le premier essai a refusé le commit qui installait le hook, parce que le message de commit _parlait_ de la commande interdite. Le motif a donc été ancré en position de commande : début de ligne, ou après un séparateur de shell. Le second défaut était l'inverse — `git push; echo fini` et `(git push)` passaient, le motif exigeant un espace après le verbe. Un filtre trop large bloque le travail, un filtre trop étroit ne protège pas, et seule l'exécution réelle a montré de quel côté il penchait.

Le découpage en lignes de `grep` ferme au passage le contournement par commande multi-ligne, au prix d'un refus à tort si une ligne de message de commit _commence_ par la commande. L'erreur va du bon côté : un refus se lève en demandant, un contournement ne se voit pas.

**Le troisième défaut a demandé un aller-retour, et c'est le plus instructif des trois.** Choisi en `deny`, le hook a bloqué la fusion des PR #25 et #26 que l'auteur venait d'autoriser. `deny` semblait donc trop dur : `CLAUDE.md` dit « **toujours s'arrêter pour** », pas « ne jamais », et `ask` — qui ouvre une demande de permission — lisait mieux la consigne. Le hook est passé en `ask`.

**L'essai a échoué au premier usage réel.** Une fusion de pull request est passée sans qu'aucune demande n'atteigne l'auteur : `ask` délègue la décision au mode de permission de la session, et un mode permissif l'approuve en silence. Retour à `deny`, décidé le 09/10.

La leçon vaut au-delà de ce fichier, et c'est la même que celle du cloisonnement : **une garantie qui dépend d'un réglage par ailleurs modifiable n'est pas une garantie.** `ask` était plus fidèle à la lettre de la consigne et strictement plus faible que `deny` en pratique. Entre les deux, la formulation cède.

Ce que `deny` coûte, et qu'il faut assumer : l'auteur tape lui-même chaque publication. Présenter la commande prête à coller fait désormais partie du travail.

Les trente-deux cas sont versionnés dans `.claude/hooks/`, lancés par `npm run test:hook`. Hors CI : c'est une garantie de poste de travail, pas un comportement du produit. Un garde-fou qui a produit trois défauts en une journée n'avait rien à faire sans test.

---

## 2026-11-02 — Le calendrier s'ancre sur la soutenance, pas sur une durée choisie

**Contexte.** Trois documents portaient une planification déduite, non constatée. `cahier-des-charges.md` annonçait « 277 heures sur six mois », `plan-livraison.md` en tirait une « soutenance visée à six mois » puis un gel au 15 janvier 2027, et la règle de gel parlait du « mois 6 ». Aucun document ne nommait de date de session — la seule contrainte dure du projet était absente du dossier qui planifie le projet.

L'écart a été découvert en répondant à la question « pourquoi le 15 janvier ? » : la réponse était « parce que c'est 15 août plus cinq mois », ce qui n'est pas une justification.

**Options.** (a) Garder la planification en durée et noter la date de session à côté. (b) Réancrer tout le calendrier sur la date de soutenance.

**Décision.** (b). La soutenance est le **15 avril 2027**, et le dossier se rend **le 8 avril**, une semaine avant. Le point d'ancrage est le rendu, pas la soutenance : le gel passe au **8 mars 2027**, un mois avant le rendu. Le projet dure donc huit mois, et non six.

**Raison.** Une date de session ne se négocie pas ; une durée choisie, si. Planifier sur la seconde en ignorant la première, c'est construire un calendrier qui peut être juste par hasard. Il l'était d'ailleurs dans le mauvais sens : le dossier se croyait en retard de huit semaines qu'il n'avait pas.

La règle de gel a été reformulée au passage. Écrite en « mois 6 », elle désignait un rang depuis le démarrage ; elle porte en réalité sur une durée — le dernier mois — et se recalcule depuis le rendu du dossier. Les deux formulations coïncidaient tant que le projet durait six mois, et divergeaient dès qu'il n'en durait plus six.

**Conséquences.**

- Il reste **18 semaines avant le gel** pour six lots, soit environ trois par lot, contre 1,8 selon l'ancien calcul.
- **Aucune réduction de périmètre n'est nécessaire.** Une rétrogradation de M-15 (export PDF) avait été envisagée le même jour, sur la foi du calendrier déduit : elle est abandonnée, et les dix-sept `M-xx` sont maintenus.
- Les 277 heures ne bougent pas. C'est une estimation du travail à fournir, pas un quota à remplir : un calendrier plus long réduit la cadence exigée — environ 8 h par semaine au lieu de 10,5 — il n'ouvre aucun périmètre supplémentaire.
- La date de soutenance figure désormais dans `cahier-des-charges.md`, sous « Contraintes », là où un jury la cherchera.

**Le détail qui déplace tout le calendrier.** La première version de cette entrée ancrait le gel sur la soutenance. C'était encore une déduction : le dossier professionnel se rend une semaine avant le passage, et c'est **le rendu** qui contraint. Un calendrier calé sur la soutenance aurait accordé sept jours de rédaction qui n'existent pas — la dernière semaine ne sert qu'aux répétitions, le document étant déjà parti.

La règle générale, pour les prochaines fois : **l'échéance d'un livrable est la date où on s'en sépare, pas celle où on en parle.**

---

## 2026-11-02 — L'enregistrement rejoint la publication derrière le harnais

**Contexte.** L'entrée du 08/10 installait un hook refusant `git push`, `gh pr create` et `gh pr merge`, et en excluait explicitement `git commit`. L'argument : aucune commande ne distingue un commit demandé d'un commit spontané, et un commit local se défait sans trace. L'entrée nommait elle-même cette exclusion comme « une faiblesse assumée de ce dispositif ».

Elle a été exercée trois fois en un mois — le 06/10, le 08/10, puis le 02/11 sur le lot 2, où le travail a été enregistré avant d'avoir été soumis à la relecture que `CLAUDE.md` exige.

**Options.** (a) Maintenir l'exclusion et s'en remettre à la règle écrite. (b) Refuser `git commit` comme le reste.

**Décision.** (b). Le hook refuse désormais `git commit` sous toutes ses formes, `--amend` compris.

**Raison.** L'argument d'origine portait sur la réversibilité — un commit local se défait — et pas sur ce qui était réellement en jeu. Ce que `CLAUDE.md` protège n'est pas l'intégrité de l'historique, c'est **la relecture** : l'auteur veut voir le travail avant qu'il ne soit figé, parce que c'est à ce moment-là qu'il le lit vraiment. Un commit défait après coup ne rend pas la relecture qui n'a pas eu lieu.

Le second argument — aucune commande ne distingue les deux cas — reste vrai, et ne conclut pas. Il ne dit pas qu'il faut tout laisser passer ; il dit que le tri doit se faire ailleurs, chez l'auteur.

**Conséquences.**

- Le coût est d'une commande par commit, à taper par l'auteur. C'est le même coût que pour les poussées, déjà accepté depuis le 08/10.
- Le travail est présenté indexé, avec la liste des fichiers à relire et la commande prête à coller. Préparer cette relecture fait partie du travail, et c'est inscrit dans `CLAUDE.md`.
- Six cas de test s'ajoutent, dont `--amend` et les formes composées. Le cas qui vérifiait qu'une _mention_ de la commande passe a été rejoué sur `echo`, puisque `git commit` change de camp.
- Ce fichier-ci ne peut plus être committé par l'assistant, ce qui est précisément l'effet recherché.

**Le piège, rencontré une seconde fois.** Écrire les cas de test a d'abord été refusé par le hook : le script d'édition _contenait_ les commandes interdites comme données. C'est le même défaut qu'au 08/10, vu sous un autre angle — un filtre qui lit du texte ne distingue pas une commande d'une mention, et l'outil d'écriture de fichiers, qui n'est pas du shell, est la sortie.

---

## 2026-11-02 — US-22 est scindée entre le lot 2 et le lot 4

**Contexte.** Le lot 2 livre la campagne et son référentiel de comparaison. US-22 demande deux formes de référentiel, exclusives l'une de l'autre : un profil décrit au clavier, ou un document de référence déposé. Un de ses critères d'acceptation porte sur la seconde : « un référentiel illisible est refusé **à l'enregistrement**, pas découvert à l'analyse ».

Ce critère suppose la chaîne d'extraction de texte — `pdftotext`, et `tesseract` en secours — qui est livrée au lot 4. Il n'est donc pas satisfiable au lot 2, et le plan de livraison dit qu'un lot n'est fini que lorsque ses critères d'acceptation passent.

**Options.** (a) Scinder US-22 : profil décrit au lot 2, document déposé au lot 4. (b) Avancer l'extraction au lot 2, pour le seul référentiel. (c) Déplacer US-22 entière au lot 4.

**Décision.** (a).

**Pourquoi pas (b).** Cela construirait un morceau du cœur du produit hors de son lot, avec sa dépendance système à installer en trois endroits, pour servir un seul usage — et le ferait au moment où l'extraction n'a encore aucun cas réel pour se valider. Le lot 4 est déjà le plus lourd et le plus incertain des six ; lui retirer sa première brique pour la poser ailleurs ne le rend pas plus sûr.

**Pourquoi pas (c).** Le lot 3 livre l'import, qui vise une campagne. Sans référentiel, aucune campagne ne peut s'activer (RG-08), et le lot 3 importerait donc dans des campagnes inertes. Le profil décrit au lot 2 est ce qui rend le lot 3 testable de bout en bout.

**Ce que ça change, et ce que ça ne change pas.** `M-16` est inchangé, RG-08 est inchangée dans son énoncé comme dans sa contrainte `CHECK`, et l'identifiant US-22 n'est ni renuméroté ni réattribué. Seul l'échelonnement de ses critères devient explicite, annoncé sur place dans une section « Historique », comme pour RG-07.

**Conséquences.**

- L'API du lot 2 ne sert que la forme décrite. Accepter d'ici là un `storageKey` venu de l'appelant enregistrerait un pointeur vers un fichier que personne n'a écrit, en laissant le client choisir où il pointe.
- La contrainte `CHECK` garde la forme déposée ouverte côté base : elle est prête, rien ne peut l'écrire, et c'est cohérent — une colonne vide par échelonnement n'est pas une colonne sans information.
- Les écrans du lot 2 n'affichent pas de dépôt de fichier. En afficher un, désactivé, annoncerait une capacité absente.
- Le lot 4 reprend US-22 dans sa liste, aux côtés d'US-10 et d'US-23.

**Trouvé en chemin.** Les règles de gestion annoncent chacune leur lot d'implémentation, et trois de ces mentions dataient d'avant le plan de livraison du 06/10 : RG-07 renvoyait US-07 au lot 2 au lieu du lot 3, RG-09 renvoyait US-23 au lot 2 au lieu du lot 4. Corrigées. Une mention de lot écrite avant le plan qui définit les lots était une divergence qui n'attendait qu'un lecteur attentif.

---

## 2026-11-02 — Le jeton d'invitation tient en deux colonnes

> **Consignée le 05/11/2026**, trois jours après la décision. Le retard n'est pas anodin : la décision n'a existé pendant ces trois jours que dans la mémoire de l'assistant, invisible pour l'auteur comme pour le dossier, pendant que le journal continuait d'annoncer le point « à trancher ». C'est le défaut qui a motivé le registre des questions ouvertes et le vérificateur de cohérence — voir l'entrée du 05/11.

**Contexte.** L'entrée du 05/10/2026 décide du lien d'invitation à usage unique pour US-02, et laisse ouvert (**Q-02**) le moyen de porter le jeton : une table dédiée, ou deux colonnes sur `user`.

**Options.** (a) Une entité `Invitation` — identifiant, compte visé, hachage, expiration, consommation, création. (b) Deux colonnes sur `user` : `invitationTokenHash` et `invitationExpiresAt`.

**Décision.** (b).

**Pourquoi.** Un seul jeton est vivant à la fois, et l'invitation est en relation 1-1 avec le compte : ce n'est pas une entité qui a sa propre vie, c'est **un état du compte**. Une table permettrait plusieurs lignes par utilisateur — un état que le produit n'a pas, et qu'il faudrait alors une règle pour arbitrer.

Et le MCD gagnerait une entité que **ne justifie aucune user story**. C'est exactement le motif pour lequel `Criterion` a été supprimée le 03/09/2026. Faire entrer par la petite porte ce qu'on a fait sortir par la grande deux mois plus tôt coûterait cher devant un jury Merise, pour un bénéfice nul.

**Pourquoi pas l'historique des invitations.** Il n'est demandé par personne, et il existe déjà : le journal d'audit porte `USER_CREATED`, rattaché à l'établissement et non au compte, donc survivant à la purge. Une table d'invitations serait une seconde trace, à entretenir et à purger elle aussi.

**Conséquences.**

- `user` gagne `invitationTokenHash` et `invitationExpiresAt`, tous deux nullables : `null` signifie « aucune invitation en cours », ce qui est une information et non une colonne vide.
- Le jeton est stocké **haché**. Un vol de base ne doit pas donner la main sur un compte en attente. Un hachage rapide suffit, contrairement à un mot de passe : le jeton est long et tiré au hasard, il n'y a rien à deviner par force brute.
- `passwordHash` est aujourd'hui non nullable. Un compte invité n'en a pas encore : l'implémentation devra trancher entre rendre la colonne nullable et y poser une valeur inutilisable. La première voie dit la vérité au schéma, la seconde se contente de la cacher.
- Les quatre livrables du modèle — MCD, MLD, MPD, dictionnaire de données — se mettent à jour **dans la même séance que la migration**, pas après.

**Ce qui reste à faire.** Rien n'est implémenté. C'est une dette du lot 1 à solder au lot 2, et la raison pour laquelle l'issue US-02 ne peut pas être fermée.

---

## 2026-11-03 — Une recette démarre l'application et entre par la porte

**Contexte.** Quatre défauts sont apparus en une matinée, en voulant simplement se connecter aux écrans du lot 2 : aucun compte n'était créable, le serveur de développement n'avait aucune route vers l'API, `npm run dev` ne construisait pas les contrats partagés, et le chemin du `.env` se cassait dès qu'un fichier était ajouté hors de `src/` — avec, au passage, `npm run start:prod` hors service sans que rien ne le signale.

La suite de tests était verte pendant tout ce temps, et elle avait raison. Les tests de bout en bout appellent l'API **dans le même processus** : ils ne construisent rien, n'ouvrent aucun port, ne traversent aucune passerelle, et l'écran de connexion est testé contre un serveur simulé. Le proxy du serveur de développement n'appartient à aucun chemin testé.

Les quatre défauts n'en font qu'un : **personne n'avait jamais ouvert cette application dans un navigateur et ne s'y était connecté.** Personne ne le pouvait — il n'existait aucun compte.

**Options.** (a) Un script de recette en HTTP, lancé par la CI. (b) Playwright, un navigateur pilotant la vraie interface. (c) Ne rien ajouter et compter sur l'attention.

**Décision.** (a) maintenant, (b) au lot 6, avec la coquille de navigation.

**Pourquoi.** Un seul scénario coche les quatre cases : partir du dépôt, tout construire, démarrer la vraie pile, entrer par la porte. Le script le fait en une trentaine de lignes, sans dépendance, pour deux minutes de CI. Playwright ajouterait les erreurs d'exécution du front — un gabarit qui lève, une route absente, une clé de traduction manquante — mais le lot 2 n'a que deux écrans isolés, et des parcours de navigation n'ont de sens qu'une fois la coquille livrée. Le dossier attendra de toute façon une recette formelle ; elle arrivera avec de quoi la remplir.

**Pourquoi pas (c).** Les quatre défauts ont été trouvés par l'auteur, à la main, en voulant se servir du produit. C'est le mode de détection le plus coûteux et le moins fiable dont on dispose.

**Conséquences.**

- `scripts/recette.sh`, lancé par `npm run recette`, remplace l'étape de build en CI : il construit tout, puis démarre le binaire construit et le serveur de développement, se connecte, lit et crée une campagne, et vérifie qu'un mot de passe faux reste un 401 et non une panne.
- Il contrôle le **type de contenu** autant que le code HTTP. Le serveur de développement répond 200 en HTML pour toute route inconnue : sans ce second contrôle, une passerelle absente passerait pour un succès.
- Il a été éprouvé en réintroduisant deux des quatre défauts : les deux font échouer la recette, avec un message qui désigne la cause.
- Deux pièges sont durcis plutôt que surveillés. La racine du dépôt est **trouvée en remontant** jusqu'au `package.json` qui déclare les workspaces, au lieu d'être comptée en `../..` depuis le fichier compilé. Le port de l'API est **lu** dans le `.env` par `proxy.conf.mjs`, au lieu d'y être recopié.
- Le seed est la contrepartie indispensable : sans premier compte, aucune recette ne peut se connecter.

**Ce que la recette ne couvre pas, sciemment.** Le troisième défaut — les contrats non construits au démarrage de `npm run dev` — n'est pas rejouable par ce script, qui construit avant de démarrer. Il est traité structurellement : un `predev`, et plus de nettoyage du dossier de sortie en mode surveillance. Une régression se verrait au premier `npm run dev` d'un dépôt propre.

**Reste ouvert.** En production, personne ne peut créer le premier administrateur d'un établissement client. Le seed ne règle que le poste de développement. Soit un `M-xx` d'inscription, soit une commande d'administration — à trancher avant la mise en ligne (**Q-03**).

---

## 2026-11-05 — Le front repasse en anglais, et la règle de langue est réécrite

**Contexte.** Le README annonçait depuis le début : « le code, la base et l'API sont en anglais ». Le front disait le contraire — `connexion.ts`, `classement.ts`, `campagnes/`, `ListeCampagnes`, `ReglagesCampagne`, `CampagnesService`, et les routes `/connexion`, `/campagnes`, `/classement`.

Ce n'était pas un choix : aucune entrée de ce journal ne le portait. Une dérive partie du lot 1, étendue au lot 2 le 03/11 en nommant quatre fichiers de campagne en français « pour suivre la convention existante » — c'est-à-dire en suivant le code contre la règle écrite, sans le signaler.

Le détail qui tranche : les clés de traduction étaient **déjà** en anglais. On lisait donc, dans un même fichier, `class ReglagesCampagne`, `t('campaign.weighting')` et `/api/campaigns`. Trois orthographes pour une notion, et côté API la même chose s'appelait `CampaignsService`. Une recherche sur « campaign » ne ramenait que la moitié du produit.

**Options.** (a) Tout passer en anglais, routes comprises. (b) Garder le français côté front et corriger la règle écrite pour qu'elle dise vrai. (c) Anglais pour les identifiants, français pour les routes, qui sont visibles de l'utilisateur.

**Décision.** (a).

**Pourquoi pas (b).** La règle est bonne et le reste du dépôt l'applique. Défendre une exception devant un jury qui sait chercher coûte plus cher que de renommer quatorze fichiers.

**Pourquoi pas (c).** L'interface est bilingue. Une URL française n'est pas « la langue de l'utilisateur », c'est la langue d'un seul des deux publics : un anglophone naviguerait vers `/campagnes`. Et il n'existe aucun utilisateur en production, donc le changement d'URL ne coûte rien aujourd'hui — il coûterait plus tard.

**Ce qui change.** `connexion` → `login`, `classement` → `ranking`, `campagnes` → `campaigns`, `liste-campagnes` → `campaign-list`, `reglages-campagne` → `campaign-settings`, avec les classes, sélecteurs, routes et identifiants locaux correspondants. Le paramètre d'URL `suite` devient `next`. Les commentaires de gabarits et les intitulés de tests passent en anglais comme ceux de l'API.

**La règle, réécrite pour qu'elle couvre le cas qui a dérivé.** Le **produit** est en anglais — et le front en fait partie au même titre que l'API. L'**outillage** et la **documentation** sont en français : `scripts/`, les commentaires de CI, le dossier. Ce qui s'affiche vient d'une clé de traduction : un composant `Login` qui affiche « Connexion » est correct, et c'est la preuve que la séparation tient. Un test l'affirme désormais explicitement, pour que le prochain remplacement en masse ne le retourne pas en silence.

**Trouvé en chemin.** Le remplacement automatique a produit trois défauts, relus un par un : un import pointant vers un fichier inexistant, une variable `next` masquant le gestionnaire du même nom dans l'intercepteur, et une assertion qui vérifiait l'affichage français et s'est retrouvée à attendre « Login ». Celle-là serait passée inaperçue — le test restait vert, il ne vérifiait simplement plus rien. Un renommage en masse se relit intégralement, ou ne se fait pas.

---

## 2026-11-05 — Les règles du cadre deviennent des mécanismes

**Contexte.** `CLAUDE.md` cadre le travail depuis le 05/10/2026, et son contenu n'a jamais été contesté. Pourtant, sur un mois :

- le front a dérivé en français sur deux lots entiers, alors que la règle de langue était écrite et sans ambiguïté ;
- la décision sur le jeton d'invitation a vécu trois jours hors du dépôt, alors que la règle dit « le jour où elle est prise » (**Q-02**) ;
- les vingt-quatre issues GitHub sont restées ouvertes, zéro fermée, alors que le lot 1 était fusionné depuis trois semaines ;
- `RG-08` s'annonçait « à implémenter » au tableau de synthèse pendant que le lot 2 la testait des deux côtés du contrat, et `RG-10` n'y figurait pas du tout ;
- trois arbitrages en suspens vivaient dispersés dans le journal, retrouvables seulement en cherchant « à trancher ».

Ce qui a tenu sur la même période se compte aussi : le hook qui refuse `git commit`, la CI, le `pretest` qui reconstruit les contrats partagés. Aucun n'est mieux écrit que les règles qui ont dérivé. **La différence est qu'ils tombent en panne.**

**Options.** (a) Rappeler les règles plus fermement et plus souvent. (b) Un vérificateur qui échoue, lancé par la CI. (c) Accepter la dérive et corriger avant la soutenance.

**Décision.** (b) — c'est le même arbitrage que le 08/10/2026 pour la règle de non-publication, et pour la même raison.

**Pourquoi pas (a).** C'est ce qui a été tenté, implicitement, pendant un mois. La règle de langue est le contre-exemple décisif : parfaitement claire, elle a été enfreinte par celui-là même qui venait de la lire, en suivant le code existant plutôt que la règle écrite. Une consigne ne se défend pas contre l'habitude.

**Pourquoi pas (c).** Un dossier rattrapé en fin de parcours est exactement le mode d'échec que `docs/README.md` annonce vouloir éviter — « une bonne application avec un dossier reconstitué de mémoire en trois week-ends ».

**Ce qui est mis en place.**

- **`tests/coherence.test.ts`**, lancé par `npm run coherence`, par `npm test` et par la CI juste après l'installation. Il vérifie cinq invariants : aucun identifiant cité sans être déclaré, aucun identifiant déclaré deux fois sous la même forme, aucune question ouverte sans clé de registre, aucune règle de gestion dont l'état annoncé contredit les tests — dans les deux sens —, aucune clé de traduction présente dans une seule langue.
- **`docs/questions-ouvertes.md`**, registre des `Q-xx`. Le journal est chronologique : il dit ce qui a été décidé, pas ce qui attend de l'être. Les trois arbitrages en suspens y sont enregistrés, et le vérificateur refuse désormais un « à trancher » qui ne cite aucune clé.
- **`.github/pull_request_template.md`**, qui porte la ligne `Closes #n` et la définition de « lot fini ». Le jalon GitHub portait déjà le lot et l'étiquette l'épopée : il ne manquait que la fermeture.
- **`.commits/`**, ignoré par git, pour les messages de commit en attente de relecture. Ils vivaient dans un dossier temporaire propre à la session, disparu le lendemain — au moment précis où l'auteur veut relire.

**Les quatre incohérences que le vérificateur a trouvées en entrant en service** sont corrigées : les trois questions ouvertes citent leur clé, `RG-10` figure au tableau de synthèse, `RG-08` y passe à « Testée ».

**Il a lui-même été éprouvé.** Ses détections sont isolées en fonctions pures, et le second bloc du fichier les soumet à des exemples : une réattribution, une référence pendante, une question sans clé — et aussi trois écritures légitimes qui leur ressemblent et ne doivent pas les déclencher, car un vérificateur qui crie trop est désarmé en quinze jours.

La première version en a révélé un dans le vérificateur lui-même : son corpus venait de `git ls-files`, qui ne liste que les fichiers suivis. **Un document créé dans la séance n'était vérifié par rien jusqu'à son premier commit** — c'est-à-dire au moment où il est le plus susceptible de citer un identifiant inexistant. Le registre des questions ouvertes, écrit une heure plus tôt, était dans cet angle mort.

**Un test, pas un script, et pas un skill.** Trois formes étaient possibles. Un _skill_ de l'assistant a été écarté d'emblée : c'est un prompt, il ne s'exécute que si un agent est invoqué et choisit de s'en servir — exactement le mode de défaillance qu'on cherche à fermer, et la CI ne sait pas en invoquer un. Restaient le script shell et le test.

La première version était en shell, et elle a buté sur `sed -i`, qui ne s'écrit pas pareil sous BSD et sous GNU. Le test Vitest fait le même travail en un fichier au lieu de deux, dans le langage du reste du dépôt, avec des messages d'échec qui nomment la cause, et il sabote des chaînes en mémoire au lieu de réécrire des fichiers du dépôt pour s'éprouver.

**Ce qu'on perd :** le shell tournait avant `npm ci` et échouait en dix secondes sur une faute de dossier. Le test demande l'installation. Le coût réel est d'une minute et demie d'attente dans le seul cas où le dossier est en faute, contre une portabilité fragile et un second script à maintenir tous les autres jours.

C'est le troisième mécanisme sur trois à produire un défaut le jour de son installation. Le hook en avait produit trois, la recette avait besoin qu'on lui réintroduise deux défauts pour prouver qu'elle les voyait. **Faire échouer un garde-fou exprès fait partie de son écriture, pas de sa maintenance.**

**Ce que cela ne couvre pas.** Le vérificateur ne lit pas GitHub : il ne peut pas constater qu'une issue est restée ouverte. Ce point-là repose sur le gabarit de PR, donc encore sur l'attention — mais une attention sollicitée au seul moment où elle porte, et par un formulaire pré-rempli plutôt que par un paragraphe lu un mois plus tôt.

Il ne juge pas non plus le contenu : il vérifie que les documents ne se contredisent pas, jamais qu'ils disent vrai. Un énoncé faux mais cohérent passe.

**Reste ouvert.** Rien de nouveau — le registre est à jour, **Q-01** et **Q-03** attendent leur échéance.

---

## 2026-11-06 — La règle de langue reçoit le mécanisme qui lui manquait

**Contexte.** La veille, le front a été repassé en anglais et la règle de langue réécrite pour couvrir le cas qui avait dérivé. Elle restait pourtant la seule règle du cadre dont la violation ne cassait rien : le vérificateur comparait les clés de traduction entre `fr.json` et `en.json`, ce qui ne dit rien d'un composant nommé `ReglagesCampagne` ni d'un `<h1>Paramètres</h1>` écrit en dur dans un gabarit.

C'est la règle qui a coûté le plus cher — deux lots entiers — et le renommage de la veille l'a seulement remise à zéro. Rien n'empêchait la même dérive de recommencer au lot 3.

**Options.** (a) Interdire tout caractère accentué dans le code du produit. (b) Comparer chaque identifiant à un dictionnaire français. (c) Une liste fermée de mots français, choisis pour n'exister qu'en français.

**Décision.** (a) **et** (c), qui ne visent pas la même faute.

L'accent attrape la chaîne d'interface restée dans un gabarit — le mot que l'utilisateur lit et qui n'est pas passé par une clé. La liste de mots attrape le nom français **sans accent**, qui est la forme qu'avait prise la dérive : `ReglagesCampagne`, `liste-campagnes`, `/connexion`. Aucun accent dans aucun des trois.

**Pourquoi pas (b).** Un dictionnaire classe `type`, `document`, `route`, `service`, `table` comme français. Le vérificateur crierait sur chaque fichier du dépôt et serait retiré dans la semaine. La liste est donc fermée et conservatrice : `analyse`, `importer`, `modifier`, `precedent` et `rapport` en sont **absents**, parce que ce sont aussi des mots anglais. Elle laisse passer des dérives, et c'est le prix pour qu'elle reste en service.

**Les deux exemptions, et pourquoi elles sont justes.**

- **Les tests sont exclus de la vérification des accents.** Leurs jeux d'essai sont des données françaises légitimes — une campagne s'appelle « Mastère 2027 » — et leurs assertions citent le libellé attendu à l'écran, qui est français par construction. Leur **chemin**, lui, reste jugé : un fichier mal nommé l'est tout autant sous `.spec.ts`.
- **Les noms de fichiers du dossier de conception sont retirés avant jugement.** Le dossier est en français, et un commentaire qui renvoie à `Connexion.dc.html` désigne une maquette : il ne nomme rien dans le produit. Seules les extensions de documentation sont retirées — jamais `.ts` ni `.html` —, sans quoi un fichier nommé en français échapperait justement à la vérification.

**Éprouvé par sabotage, sur le dépôt réel.** Une chaîne accentuée ajoutée à `campaign-list.html`, un `seuilDeConfiance` ajouté à `campaigns.service.ts`, et `campaign-list.ts` renommé `liste-campagnes.ts` : les trois sont relevés, avec le fichier, la ligne et le mot en cause. Cinq exemples en mémoire complètent l'épreuve, dont deux tolérances — la citation d'une maquette, et une ligne d'anglais qui ressemble au français.

**Ce que cela ne couvre pas.** Une chaîne d'interface en anglais écrite en dur passe : elle n'a pas d'accent et n'est dans aucune liste. Le mécanisme tient la dérive constatée, pas toutes les dérives imaginables.

**Conséquence.** Le vérificateur passe de cinq invariants à sept. Il reste la seule chose qui s'exécute, et le cadre ne gagne pas une ligne de prose.

---

## 2026-11-06 — Le vérificateur de langue avait un angle mort, et quelque chose dedans

**Contexte.** Le mécanisme installé le matin même couvrait `apps/web/src`, `apps/api/src` et `packages/shared/src`. Les tests end-to-end vivent dans `apps/api/test`, qui n'est sous aucune de ces racines. Ils n'étaient vérifiés par rien.

Derrière l'angle mort : **`campagne.e2e-spec.ts`**, **`cloisonnement.e2e-spec.ts`**, et vingt et un intitulés de tests en français. Le renommage du 05/11 avait traité le front et laissé les tests de l'API.

C'est le deuxième mécanisme de la semaine à révéler un défaut dans la minute qui suit son entrée en service, et le deuxième à le révéler **dans lui-même** plutôt que dans le dépôt. Le précédent était le corpus limité aux fichiers suivis par git.

**Ce qui change.** `apps/api/test` entre dans la portée. Les fichiers deviennent `campaign.e2e-spec.ts` et `tenant-isolation.e2e-spec.ts`, les vingt et un intitulés passent en anglais, et le commentaire français qui expliquait pourquoi US-22 n'est servie qu'à moitié avec eux. Le plan de sécurisation, qui citait l'ancien nom, suit.

**Un intitulé n'est pas du code, et ne se juge pas pareil.** Deux des vingt et un ne portaient ni accent ni mot métier : « accepte des poids qui ne totalisent pas 1 ». Le vocabulaire ne les trahissait pas — leurs mots outils, oui. Les intitulés sont donc jugés en plus sur une petite liste d'articles et de pronoms qui n'existent pas en anglais : `qui`, `que`, `sans`, `une`, `dans`, `chaque`. Cette liste ne s'applique **qu'aux intitulés** : un identifiant ne ressemble pas à une phrase, et l'y chercher ne produirait que du bruit.

**Ce que cela ne couvre toujours pas.** Le corps d'un test reste exempt — ses jeux d'essai sont du français légitime —, donc un commentaire français y passe encore. Celui du lot 2 a été trouvé à la lecture, pas par le vérificateur.

**Conséquence.** Huit invariants. Les vingt-huit tests end-to-end passent après renommage.
