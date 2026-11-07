# User stories

Format : `En tant que <persona>, je veux <action> afin de <bénéfice>`, avec critères d'acceptation vérifiables.

Chaque story porte une référence stable (`US-xx`) reprise dans les issues GitHub, les cas d'utilisation et le cahier de recettes. La colonne « périmètre » renvoie à [`perimetre.md`](perimetre.md).

Personas : **Claire** responsable des admissions, **Marc** administrateur. Voir [`personas.md`](personas.md).

---

## Épopée 1 — Accès et administration

### US-01 · Se connecter

**En tant que** Claire, **je veux** me connecter avec mon email et mon mot de passe **afin d'**accéder aux candidatures de mon établissement.
_Périmètre : M-01_

- Un email et un mot de passe valides ouvrent une session et redirigent vers le tableau de bord
- Des identifiants invalides affichent un message unique, qui ne révèle pas si l'email existe
- La session est portée par un cookie `httpOnly`, inaccessible au JavaScript de la page
- Après six échecs consécutifs sur un même compte, les tentatives sont temporisées
- Une session expirée ramène à l'écran de connexion sans perte de l'URL demandée

### US-02 · Créer les comptes de l'équipe

**En tant que** Marc, **je veux** créer des comptes pour mes chargés d'admission **afin qu'**ils accèdent aux campagnes sans partager mes identifiants.
_Périmètre : M-01_

- Un administrateur crée un compte avec email, nom et rôle
- Un chargé d'admission ne peut ni créer de compte ni modifier une campagne
- Un compte désactivé ne peut plus se connecter, mais les lots qu'il a importés restent visibles et attribués
- Toute création, modification et désactivation est inscrite au journal d'audit

**Le compte créé n'est pas encore utilisable**, et c'est voulu : son propriétaire doit choisir son mot de passe lui-même. L'administrateur ne doit jamais connaître le mot de passe d'un membre de son équipe — sans quoi le journal d'audit ne prouve plus qui a agi.

- La création produit un **lien d'invitation**, que l'administrateur transmet lui-même : par courriel, par message, de vive voix. Probo n'envoie aucun courriel
- Le lien est valable **sept jours**, à usage unique, et devient caduc dès qu'un mot de passe est posé
- Le lien mène à un écran où le propriétaire choisit son mot de passe, d'au moins douze caractères
- Tant que le mot de passe n'est pas posé, le compte apparaît comme **invité** dans la liste et ne peut pas se connecter
- L'administrateur peut régénérer un lien expiré ou perdu ; l'ancien cesse aussitôt de fonctionner
- La génération d'un lien et la pose d'un mot de passe sont inscrites au journal d'audit

### US-03 · Ne jamais voir les données d'un autre établissement

**En tant que** Marc, **je veux** l'assurance que mes données sont isolées **afin de** répondre à mon responsable RGPD.
_Périmètre : M-11_

- Toute lecture est filtrée par l'établissement de l'utilisateur connecté
- Une requête portant l'identifiant d'une ressource d'un autre établissement renvoie 404, jamais 403 — l'existence de la ressource n'est pas révélée
- Un test automatisé vérifie ce cloisonnement sur chaque type de ressource

---

## Épopée 2 — Campagne

### US-04 · Créer une campagne

**En tant que** Marc, **je veux** créer une campagne **afin de** cadrer l'analyse d'une session de recrutement.
_Périmètre : M-02_

- Une campagne a un nom, une description facultative, une date d'ouverture et une date de clôture
- À la création, elle est au statut brouillon et n'accepte aucun import
- Le passage au statut actif requiert au moins un type de document attendu

### US-05 · Définir les types de documents attendus

**En tant que** Marc, **je veux** déclarer quels documents je réclame **afin que** les fichiers hors-sujet soient signalés.
_Périmètre : M-02, M-06_

- Sélection multiple parmi CV, lettre de motivation, lettre de recommandation, portfolio
- Au moins un type est obligatoire
- Un document dont le type détecté n'est pas dans la liste est marqué atypique (RG-02)

### US-06 · Régler le seuil de confiance et la pondération

**En tant que** Marc, **je veux** ajuster le seuil de confiance et le poids des trois axes **afin d'**adapter l'analyse à mon type de formation.
_Périmètre : M-02_

- Le seuil de confiance est un entier de 0 à 100, par défaut 70
- Trois curseurs règlent les poids d'adéquation, de clarté et de qualité formelle
- Les poids sont normalisés par leur somme : leur total n'a pas besoin de valoir 1 (RG-05)
- Une pondération entièrement nulle est refusée à l'enregistrement
- Modifier ces réglages n'altère pas les analyses déjà produites

### US-22 · Fournir le référentiel de comparaison

**En tant que** Marc, **je veux** décrire ce que j'attends de chaque type de document **afin que** le score d'adéquation ait un point de comparaison explicite.
_Périmètre : M-16_

**Au lot 2 — le profil décrit**

- Chaque type de document attendu porte un référentiel, et un seul (RG-08)
- Un texte descriptif saisi par l'établissement
- Le passage de la campagne au statut actif exige un référentiel par type attendu
- L'écran avertit explicitement qu'il faut décrire un **profil recherché**, et non déposer le CV d'un candidat réel
- Modifier un référentiel n'altère pas les analyses déjà produites

**Au lot 4 — le document déposé**

- Une seconde forme, exclusive de la première : un document de référence déposé, qui remplace le texte s'il y en avait un
- Son texte est extrait par la même chaîne que les candidatures ; un référentiel illisible est refusé **à l'enregistrement**, pas découvert à l'analyse

> **Historique — scindée le 02/11/2026.** Cette US était entière au lot 2. Le second critère de la forme déposée exige de refuser un référentiel illisible au moment où on l'enregistre : cela suppose la chaîne d'extraction, qui est livrée au lot 4. Une forme déposée construite plus tôt aurait enregistré un fichier sans savoir s'il est lisible, ce que ce critère interdit précisément.
>
> L'identifiant ne bouge pas et le périmètre non plus — `M-16` est inchangé. Seul l'échelonnement est désormais explicite. Voir le journal de décisions.

---

## Épopée 3 — Import

### US-07 · Importer une archive ZIP

**En tant que** Claire, **je veux** déposer un ZIP de candidatures **afin de** lancer l'analyse sans réorganiser mes fichiers.
_Périmètre : M-03_

- Le dépôt accepte le glisser-déposer et la sélection de fichier
- Un sous-dossier par candidat et le préfixe du nom de fichier servent d'**indices** de regroupement, confirmés ou infirmés par l'identité lue dans le contenu (RG-09, US-23)
- Les fichiers dépassant la taille maximale, hors types autorisés, ou en surnombre sont rejetés et **listés à l'écran** — jamais ignorés en silence
- Une entrée d'archive dont le chemin résolu sort du répertoire de destination est rejetée sans être écrite sur disque (RG-07)
- Une entrée qui n'est pas un fichier régulier — lien symbolique en particulier — est rejetée (RG-07)
- Une archive dont le rapport de décompression dépasse le plafond est interrompue en cours d'extraction, sans attendre la fin (RG-07)
- Un rejet n'interrompt pas l'import : le lot se poursuit et le compte des entrées refusées est affiché
- **Un plafond d'archive dépassé — nombre de fichiers, taille totale décompressée, rapport — interrompt tout** : ce qui avait été extrait est supprimé et aucun document n'est importé (RG-07)
- Chaque entrée refusée est consultable avec son chemin dans l'archive, sa taille et son motif
- **Un fichier sans indice de regroupement** — ni sous-dossier, ni préfixe exploitable — n'est rattaché à aucune candidature : il est importé et **présenté comme orphelin à la réconciliation**, à rattacher à la main (`CU-04` 8a, RG-09). Une candidature par fichier a été explicitement écartée : à 1 248 documents, elle produit un échec silencieux
- L'écran affiche l'avancement document par document

> **L'archive ZIP est le seul canal d'ingestion** depuis le 31/08/2026. Cette US n'est donc plus un chemin parmi deux : elle est la porte d'entrée unique du produit, et RG-07 en est la serrure.

### US-23 · Réconcilier les candidats avant l'analyse

**En tant que** Claire, **je veux** arbitrer les regroupements douteux **afin qu'**aucun document ne soit attribué au mauvais candidat.
_Périmètre : M-17_

- L'identité est lue dans le texte de chaque document, jamais dans son seul nom de fichier (RG-09)
- Trois cas sont soumis à l'arbitrage : contradiction entre nom de fichier et contenu, identité lue avec une confiance insuffisante, homonymie entre deux candidatures du lot
- Tant qu'un cas reste en attente, le lot est au statut « à réconcilier » et **aucune analyse de niveau 2 ne démarre**
- Chaque cas montre côte à côte ce que dit le nom de fichier et ce que dit le contenu, avec un extrait du texte à l'appui
- L'utilisateur peut rattacher un document à une autre candidature, fusionner deux candidatures, ou en créer une
- Les regroupements non douteux sont appliqués sans intervention : l'écran ne montre que ce qui mérite un arbitrage
- Chaque arbitrage fixe l'origine de l'identité à `MANUAL` et est inscrit au journal d'audit

### US-08 · Enregistrer un dossier Google Drive — hors périmètre v1

> **Reportée après le titre le 31/08/2026**, avec M-14. Conservée telle quelle : l'analyse est faite, elle n'est pas à refaire, et une US barrée documente mieux un arbitrage qu'une US effacée. Ni elle ni US-09 n'entrent dans le décompte des US livrées.

**En tant que** Marc, **je veux** enregistrer un dossier Drive **afin que** mon équipe importe sans manipuler de fichiers.
_Périmètre : M-14 — reporté_

- L'écran affiche l'adresse du compte de service à qui partager le dossier
- L'enregistrement demande un libellé et l'identifiant du dossier, puis vérifie immédiatement l'accès en lecture
- Un accès refusé affiche la marche à suivre, pas une erreur technique
- Une connexion est désactivable à tout moment

### US-09 · Importer depuis un dossier Drive enregistré — hors périmètre v1

> **Reportée après le titre le 31/08/2026**, avec M-14.

**En tant que** Claire, **je veux** lancer un import depuis un dossier connu **afin d'**éviter le téléchargement puis le rechargement des fichiers.
_Périmètre : M-14 — reporté_

- Le choix se fait parmi les connexions enregistrées et actives de l'établissement
- **L'import ne part jamais d'un identifiant de dossier fourni dans la requête** — règle de cloisonnement à réintroduire sous un nouvel identifiant si la v2 se fait ; l'ancienne RG-07 porte désormais la décompression défensive
- Les sous-dossiers sont parcourus récursivement, un sous-dossier valant une candidature
- Les documents Google natifs sont exportés en PDF
- Les mêmes garde-fous que l'import ZIP s'appliquent

---

## Épopée 4 — Analyse

### US-10 · Vérifier la nature de chaque document

**En tant que** Claire, **je veux** que chaque fichier soit identifié **afin de** repérer les dossiers mal constitués.
_Périmètre : M-05_

- Chaque document reçoit un type détecté et une confiance de 0 à 100
- Une justification textuelle accompagne la classification
- Le modèle et la version de prompt utilisés sont enregistrés avec le résultat

### US-11 · Voir les documents atypiques signalés

**En tant que** Claire, **je veux** que les fichiers douteux soient écartés et signalés **afin que** le classement ne repose que sur des données fiables.
_Périmètre : M-06_

- Une confiance sous le seuil de la campagne rend le document atypique (RG-01)
- Un type hors des attendus rend le document atypique (RG-02)
- Un texte non extractible rend le document atypique, motif `UNREADABLE`, sans aucun appel au modèle (RG-03)
- Le motif est affiché en clair, pas sous forme de code
- Un document atypique n'entre dans aucun calcul de score (RG-04)
- Le signalement est visible **dans toutes les vues** : liste, détail candidature, détail document, et exports

### US-24 · Contredire un verdict d'analyse

**En tant que** Claire, **je veux** pouvoir dire au système qu'il s'est trompé sur la nature d'un document **afin que** mon jugement l'emporte sur le sien.
_Périmètre : M-18_

- Depuis le détail d'un document atypique, deux gestes : confirmer la nature détectée, ou requalifier le type (RG-10)
- Le document cesse d'être atypique et son niveau 2 s'exécute ; le score de la candidature est recalculé
- **Le verdict du modèle reste affiché à côté de la décision humaine** — jamais remplacé
- L'écran montre qui a contredit, quand, et le motif saisi
- Un document `UNREADABLE` n'offre pas ces gestes : aucune décision ne fait apparaître du texte
- La contradiction est inscrite au journal d'audit
- Une contradiction est réversible : revenir au verdict du modèle est un geste de plus, pas une impasse

### US-12 · Obtenir un score d'adéquation justifié

**En tant que** Claire, **je veux** trois sous-scores expliqués **afin de** comprendre pourquoi un dossier est bien placé.
_Périmètre : M-07_

- Trois sous-scores de 0 à 100 : adéquation, clarté, qualité formelle
- L'adéquation est mesurée au **référentiel du type de document concerné** (RG-08), et la justification s'y réfère explicitement
- Chacun est accompagné de sa propre justification textuelle
- Le score du document est la moyenne pondérée selon la campagne (RG-05)
- Le niveau 2 n'est exécuté que sur les documents retenus au niveau 1 (RG-04)

### US-13 · Voir un score par candidat

**En tant que** Claire, **je veux** un score agrégé par candidature **afin de** trier les dossiers.
_Périmètre : M-08_

- Le score de la candidature est la moyenne des scores de ses documents retenus (RG-06)
- Une candidature sans aucun document exploitable **n'a pas de score** — elle est signalée à part, et non classée dernière
- Le nombre de documents atypiques est affiché à côté du score
- Le score n'est calculé qu'une fois tous les documents de la candidature traités

---

## Épopée 5 — Consultation

### US-14 · Consulter le classement

**En tant que** Claire, **je veux** un classement trié **afin d'**attaquer par les meilleurs dossiers.
_Périmètre : M-09_

- Tri par score décroissant par défaut
- Le rang est calculé à l'affichage, jamais stocké
- Les candidatures sans score sont regroupées en fin de liste, dans une section distincte
- La liste indique pour chaque ligne : rang, nom, score, nombre de documents, nombre d'atypiques

### US-15 · Filtrer et rechercher

**En tant que** Claire, **je veux** filtrer et rechercher **afin de** retrouver un dossier ou isoler les cas problématiques.
_Périmètre : M-09_

- Recherche par nom de candidat
- Filtre « comporte au moins un document atypique »
- Filtre par plage de score
- Les filtres sont reflétés dans l'URL, pour qu'un lien puisse être partagé

### US-16 · Ouvrir le détail d'un document

**En tant que** Claire, **je veux** voir l'analyse complète d'un fichier **afin de** vérifier ou contredire le jugement de l'outil.
_Périmètre : M-10_

- L'écran présente les deux niveaux séparément, dans l'ordre
- Le niveau 1 montre le type détecté, la confiance, et la justification
- Le niveau 2 montre les trois sous-scores avec leurs justifications, ou explique pourquoi il n'a pas été exécuté
- Le fichier d'origine est téléchargeable
- La date d'analyse et le modèle utilisé sont affichés

---

## Épopée 6 — Sortie et conformité

### US-17 · Exporter le classement en CSV

**En tant que** Claire, **je veux** un CSV **afin de** poursuivre le travail dans mon tableur.
_Périmètre : M-13_

- Séparateur point-virgule et encodage UTF-8 avec BOM, pour un affichage correct dans Excel en configuration française
- Une ligne par candidature, avec rang, nom, score, nombre d'atypiques
- Les filtres actifs à l'écran s'appliquent à l'export

### US-18 · Exporter le classement en PDF

**En tant que** Claire, **je veux** un PDF **afin de** le transmettre à la commission d'admission.
_Périmètre : M-15_

- En-tête avec le nom de la campagne, la date de génération et l'établissement
- Tableau du classement, pagination et numérotation
- **Les documents atypiques sont visibles dans l'export** — un rapport qui les masquerait reproduirait le défaut que Probo dénonce
- Pied de page mentionnant la date de suppression prévue des données
- La génération est asynchrone : l'utilisateur est prévenu quand le fichier est prêt — **par le canal que tranche `Q-05`**, le même qui porte l'avancement d'un lot. Le courriel est exclu du produit, et `C-03` n'est pas au périmètre

### US-19 · Supprimer une candidature

**En tant que** Marc, **je veux** supprimer une candidature à la demande **afin d'**honorer un droit à l'effacement.
_Périmètre : M-12_

- La suppression retire la candidature, ses documents, leurs textes extraits, leurs analyses, et les fichiers stockés
- Une confirmation explicite est demandée
- L'opération est inscrite au journal d'audit, **qui survit à la suppression**

### US-20 · Purger automatiquement après 90 jours

**En tant que** Marc, **je veux** une purge automatique **afin de** respecter la limitation de conservation sans y penser.
_Périmètre : M-12_

- Chaque candidature porte une échéance de purge calculée à sa création
- Un traitement quotidien supprime les candidatures échues, fichiers compris
- Chaque purge est inscrite au journal d'audit
- La durée de conservation est affichée dans l'interface

### US-21 · Consulter le journal d'audit

**En tant que** Marc, **je veux** consulter les accès et opérations **afin de** répondre à un contrôle.
_Périmètre : M-12_

- Le journal liste horodatage, utilisateur, action, type et référence de la ressource
- Il est consultable par les administrateurs uniquement
- Il n'est jamais modifiable depuis l'interface
- Il est conservé indépendamment de la purge des candidatures

---

## Traçabilité

| Niveau            | Référence              | Emplacement                                                                         |
| ----------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Périmètre         | `M-xx`, `S-xx`, `C-xx` | [`perimetre.md`](perimetre.md)                                                      |
| User story        | `US-xx`                | ce document                                                                         |
| Règle de gestion  | `RG-xx`                | [`regles-gestion.md`](regles-gestion.md) et `packages/shared/src/business-rules.ts` |
| Cas d'utilisation | `CU-xx`                | [`cas-utilisation.md`](cas-utilisation.md)                                          |
| Recette           | `REC-xx`               | `docs/tests/cahier-de-recettes.md`                                                  |

Toute entité du futur MCD doit pouvoir se rattacher à au moins une user story de cette liste. C'est la vérification à faire **avant** de dessiner le modèle de données.
