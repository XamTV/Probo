# Règles de gestion

Ces règles sont **implémentées et testées** dans [`packages/shared/src/business-rules.ts`](../../packages/shared/src/business-rules.ts), et vérifiées par [`business-rules.test.ts`](../../packages/shared/src/business-rules.test.ts).

Ce document n'est pas une paraphrase du code : il porte l'énoncé métier et sa justification. Le code porte l'implémentation. Les deux se répondent par l'identifiant `RG-xx`, qui figure aussi dans les noms de tests — de sorte qu'une règle documentée, une règle implémentée et une règle testée soient traçables entre elles.

> **Règle de tenue.** Une règle ne change jamais ici sans changer dans le code et dans les tests, au cours de la même séance.

---

## RG-01 — Confiance insuffisante

**Énoncé.** Un document dont la confiance de classification est strictement inférieure au seuil défini sur la campagne est marqué **atypique**, motif `LOW_CONFIDENCE`.

**Pourquoi.** Une classification incertaine n'est pas une information exploitable. Scorer un document dont on ignore la nature reviendrait à comparer un CV à une lettre de motivation sur les mêmes critères.

**Paramètre.** `campaign.confidenceThreshold`, entier de 0 à 100, par défaut **70**.

**Cas limite tranché.** Une confiance **égale** au seuil est acceptée. Le seuil est un minimum atteignable, pas une barre à dépasser.

_US-11 · testé_

---

## RG-02 — Type inattendu

**Énoncé.** Un document dont le type détecté ne figure pas parmi les types attendus par la campagne est marqué **atypique**, motif `UNEXPECTED_TYPE`.

**Pourquoi.** C'est le cas d'usage fondateur du produit : le portfolio glissé à la place d'un CV. Le fichier est parfaitement lisible et correctement classé — il n'a simplement rien à faire là.

**Conséquence de modélisation.** Le caractère atypique est **relatif à la campagne**, jamais absolu. Un portfolio est légitime dans une campagne d'école d'art et hors-sujet dans une campagne de MBA.

_US-05, US-11 · testé_

---

## RG-03 — Document illisible

**Énoncé.** Un document dont le texte n'a pas pu être extrait est marqué **atypique**, motif `UNREADABLE`. **Aucun appel au modèle n'est effectué pour lui.**

**Pourquoi.** Sans texte, il n'y a rien à analyser. Appeler le modèle coûterait de l'argent et du quota pour produire une réponse inventée.

**Portée.** Couvre les PDF sans couche texte lorsque l'OCR est désactivé ou échoue, les fichiers corrompus, et les PDF protégés en lecture.

**Formulation à retenir.** Un scan non traité n'est pas une lacune du produit mais un cas atypique légitime : Probo signale qu'il ne peut pas se prononcer, plutôt que de deviner.

_US-11 · testé_

---

## Ordre de priorité des motifs

Quand plusieurs motifs s'appliquent, l'ordre est : **`UNREADABLE`, puis `LOW_CONFIDENCE`, puis `UNEXPECTED_TYPE`.**

`UNREADABLE` vient d'abord parce qu'il est constaté avant tout appel au modèle.

La confiance passe avant le type pour une raison moins évidente : un type détecté avec une confiance faible n'est pas une information fiable. Annoncer « type inattendu » sur une classification incertaine induirait l'utilisateur en erreur — on lui affirmerait la nature d'un document que l'on n'a justement pas su reconnaître.

_testé explicitement_

---

## RG-04 — Le niveau 2 ne s'exécute que sur les documents retenus

**Énoncé.** L'analyse d'adéquation n'est lancée que pour les documents non atypiques.

**Pourquoi.** C'est le principe fondateur de Probo. La plupart des outils scorent tout ce qu'on leur donne ; séparer les deux jugements — _« c'est quoi ce document »_ puis _« est-il pertinent »_ — est ce qui garantit que le classement repose sur des données fiables.

**Effet secondaire utile.** Le coût en appels au modèle diminue proportionnellement au taux de documents atypiques.

_US-11, US-12 · testé_

---

## RG-05 — Score d'un document

**Énoncé.** Le score d'un document est la moyenne pondérée de ses trois sous-scores — adéquation, clarté, qualité formelle — selon les poids définis par la campagne.

**Normalisation.** Les poids sont divisés par leur somme. Une campagne configurée avec des poids qui ne totalisent pas 1 reste exploitable, et les curseurs de l'interface n'ont pas à se contraindre mutuellement.

**Erreur de configuration.** Une pondération dont la somme est nulle **lève une erreur**. C'est une campagne mal configurée, pas un cas métier à absorber silencieusement.

**Valeurs par défaut.** Adéquation 0,5 · clarté 0,25 · qualité formelle 0,25. L'adéquation pèse double parce qu'elle répond à la question réellement posée.

_US-06, US-12 · testé_

---

## RG-06 — Score d'une candidature

**Énoncé.** Le score global d'une candidature est la moyenne des scores de ses documents retenus. Une candidature dont **aucun** document n'est exploitable **n'a pas de score** : elle vaut `null`, et non zéro.

**Pourquoi cette distinction est essentielle.** Zéro signifierait « mauvaise candidature » et la placerait en dernier du classement. `null` signifie « rien à évaluer » : la candidature sort du classement et est signalée à part, pour que Claire la traite à la main.

C'est très exactement le défaut que Probo reproche aux outils concurrents. Confondre « mauvais » et « non évaluable » produirait des faux négatifs invisibles — le pire cas pour une responsable d'admission, qui écarterait un bon dossier sans jamais le savoir.

**Moyenne simple, non pondérée.** Un CV et une lettre de motivation pèsent autant l'un que l'autre. Une pondération par type de document est envisageable mais hors périmètre (voir `C-01`).

_US-13, US-14 · testé_

---

## RG-07 — Décompression défensive d'une archive

**Énoncé.** Une entrée d'archive n'est extraite que si elle satisfait **quatre** conditions, vérifiées avant toute écriture sur disque :

1. son chemin de destination, une fois résolu, reste **à l'intérieur** du répertoire cible ;
2. c'est un fichier régulier — ni lien symbolique, ni répertoire, ni entrée spéciale ;
3. son extension et son type MIME réel appartiennent à la liste blanche ;
4. les plafonds du lot sont respectés : taille par fichier, nombre de fichiers, taille totale décompressée, et rapport de décompression.

**L'échec de ces conditions n'a pas partout le même effet, et c'est délibéré.**

| Ce qui échoue                                                                                         | Portée         | Effet                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Conditions 1, 2, 3, et le plafond de **taille par fichier**                                           | l'entrée seule | Elle est refusée, comptée dans `rejectedFileCount`, enregistrée avec son motif. **L'import se poursuit.**                                 |
| Les plafonds d'**archive** — nombre de fichiers, taille totale décompressée, rapport de décompression | le lot entier  | L'extraction est **interrompue**, ce qui avait déjà été écrit est supprimé, et **aucun document n'est importé**. Le lot passe à `FAILED`. |

Un fichier trop gros, mal typé ou au chemin dangereux est un **accident local** : on l'écarte, on le dit, le reste du lot n'y est pour rien. Une archive dont le contenu décompressé explose est un **piège visant le serveur** : poursuivre, c'est continuer à écrire sur un disque qu'on sait qu'on va saturer. Un refus se compte ; une attaque s'interrompt.

**Pourquoi.** L'archive ZIP est devenue le **seul** canal d'entrée du produit (voir le journal de décisions, 31/08/2026). Toute la surface d'attaque de l'ingestion se concentre donc ici, et son contenu est intégralement contrôlé par l'utilisateur.

Trois attaques classiques, toutes rattachées à l'OWASP Top 10 :

| Attaque         | Mécanisme                                                                        | Condition qui la bloque |
| --------------- | -------------------------------------------------------------------------------- | ----------------------- |
| _Zip slip_      | Une entrée nommée `../../etc/cron.d/x` écrit hors du répertoire de destination   | 1                       |
| Lien symbolique | Une entrée symlink pointe vers `/etc/passwd`, lu ensuite comme un document       | 2                       |
| _Zip bomb_      | 42 Ko d'archive qui se décompressent en plusieurs gigaoctets, saturant le disque | 4                       |

**Contre-mesure.** La résolution du chemin est faite avec `path.resolve`, puis comparée au répertoire cible — jamais par une simple recherche de `..` dans la chaîne, qui se contourne par encodage. Les plafonds sont lus depuis l'environnement (`INGESTION_*`) et non codés en dur, pour être durcis en production sans redéploiement du code.

Le rapport de décompression est vérifié **en cours d'extraction**, sur le flux, et non à partir de l'en-tête de l'archive : une archive malveillante déclare une taille décompressée mensongère.

**Portée de la règle.** Contrairement à RG-01 à RG-06, cette règle ne porte pas sur la valeur métier d'un document mais sur les conditions de son admission. Elle est néanmoins une règle de gestion et non un simple détail d'implémentation : elle décide si un fichier entre ou non dans le lot, et ce refus est visible par l'utilisateur.

**Historique — énoncé précisé le 06/11/2026.** L'énoncé disait « Une entrée refusée n'interrompt pas l'import » sans réserver le cas des plafonds d'archive, alors que la condition 4 les englobait. US-07 et les maquettes `ImportRefuse` et `ImportTermine` décrivaient déjà l'interruption : c'est la règle qui était en retard sur elles. Les quatre conditions sont inchangées, seul l'effet de leur échec est désormais explicite. Voir l'entrée du 06/11/2026 au journal.

**Historique.** Sous ce numéro figurait auparavant une règle sur l'origine d'un import Google Drive — un import ne pouvait citer qu'une `DriveConnection` enregistrée, jamais un identifiant de dossier reçu en requête. L'abandon de l'import Drive rend cette règle sans objet. Le raisonnement qui la fondait, sur la référence directe non sécurisée entre locataires, est conservé dans le journal de décisions.

_US-07 · testé_

---

## RG-08 — Référentiel de comparaison du niveau 2

**Énoncé.** Chaque type de document attendu par une campagne porte **un référentiel de comparaison**, et un seul. Il prend l'une de deux formes, jamais les deux à la fois : un **texte descriptif** saisi par l'établissement, ou un **document de référence déposé**, dont le texte est extrait par la même chaîne que les candidatures. Une campagne ne peut pas passer au statut actif tant qu'un type attendu n'a pas son référentiel.

**Pourquoi.** Le niveau 2 évalue « l'adéquation à la campagne ». Jusqu'ici, aucun livrable ne disait à quoi cette adéquation était mesurée : le cahier des charges parlait de « critères de la campagne » que personne n'avait définis, et l'entité `Criterion` du schéma n'était rattachée à aucune user story. Sans référentiel explicite, le sous-score d'adéquation n'est pas explicable — et un score inexplicable est indéfendable devant un candidat qui conteste, ce que RGPD et persona Sofia interdisent.

**Un référentiel par type, et non un par campagne.** On n'évalue pas une lettre de motivation sur les attendus d'un CV. Un référentiel unique et transverse rendrait le sous-score d'adéquation flou à expliquer, ce qui est exactement le défaut à éviter.

**Réserve à assumer devant le jury.** Le référentiel doit décrire un **profil recherché**, à la manière d'une fiche de poste. Y déposer le CV d'un candidat réellement admis reviendrait à mécaniser un biais — école d'origine, parcours, âge implicite — dans un contexte d'admission où c'est juridiquement sensible. L'interface le dit explicitement au moment du dépôt ; le produit ne peut pas l'empêcher techniquement, et il serait malhonnête de prétendre le contraire.

**Échelonnement, acté le 02/11/2026.** La règle ne change pas : les deux formes restent au périmètre, et l'activation continue d'exiger un référentiel par type attendu. Seule leur livraison est échelonnée — le profil décrit au lot 2, le document déposé au lot 4. Refuser un référentiel illisible **à l'enregistrement** suppose la chaîne d'extraction, qui n'existe pas avant. Jusque-là, l'API ne sert que la forme décrite, et la contrainte `CHECK` garde la seconde ouverte sans que rien ne puisse l'écrire.

**Ce que cette règle remplace.** L'entité `Criterion` et son énumération `CriterionType` sont supprimées. Elles n'étaient justifiées par aucun besoin documenté, et les critères libres restent hors périmètre (`C-01`).

_US-22 · profil décrit au lot 2, document déposé au lot 4_

---

## RG-09 — Identité du candidat déduite du contenu

**Énoncé.** L'identité du candidat est lue **dans le texte du document**, pas dans son nom de fichier. Le nom de fichier et l'arborescence de l'archive sont des indices de départ, jamais l'autorité. Quand les deux se contredisent, ou quand l'identité lue est incertaine, le lot passe au statut `AWAITING_RECONCILIATION` : **aucune analyse de niveau 2 ne démarre** tant qu'un humain n'a pas arbitré.

**Pourquoi.** C'est la contradiction que le produit se faisait à lui-même. Probo existe parce que **les noms de fichiers mentent** : un portfolio appelé `CV.pdf` est le cas d'école du README. Le niveau 1 lit donc le contenu pour établir ce qu'est un document. Mais le regroupement par candidat, lui, faisait une confiance aveugle à ce même nom de fichier.

La conséquence n'est pas symétrique. Un type mal détecté ne fait que marquer **un** document, visiblement. Un regroupement erroné **corrompt silencieusement deux scores** : le candidat A hérite d'un document de B, les deux moyennes sont fausses, et rien ne le signale. C'est précisément le faux négatif invisible que Claire redoute le plus.

**Ce que la règle impose.**

- Chaque document porte l'identité lue dans son texte et la confiance associée — `detectedCandidateName`, `detectedNameConfidence`.
- Chaque candidature enregistre **d'où vient** son identité : `FOLDER`, `FILENAME`, `CONTENT` ou `MANUAL`. Un regroupement doit rester explicable et contestable après coup.
- Trois situations déclenchent la réconciliation : contradiction entre le nom de fichier et le contenu, confiance insuffisante sur l'identité lue, et homonymie entre deux candidatures du même lot.
- Un arbitrage humain fixe l'identité en `MANUAL`, seule source qui n'est jamais réexaminée.

**Le repli précédent était illusoire.** L'extension `6a` du CU-04 prévoyait « aucun regroupement déductible → une candidature par fichier ». À 412 candidatures et 1 248 documents, cela produit 1 248 candidatures d'un document : ce n'est pas une dégradation gracieuse, c'est un échec silencieux.

_US-23 · à implémenter au lot 4_

---

## RG-10 — Contradiction humaine d'un verdict

**Énoncé.** Un utilisateur peut **contredire le verdict de niveau 1** d'un document atypique, en confirmant sa nature ou en le requalifiant. Le verdict du modèle n'est **jamais écrasé** : la décision humaine est enregistrée à côté, avec son auteur, sa date et son motif. Le document cesse alors d'être atypique et le niveau 2 s'exécute pour lui seul.

Le motif `UNREADABLE` n'est pas contredisible.

**Pourquoi.** Les personas l'exigent en toutes lettres : Claire « acceptera un outil qui **ordonne et justifie**, pas un outil qui tranche », et « elle doit pouvoir contredire l'outil ». Sans cette règle, Probo tranche — il signale un document atypique, l'exclut du calcul, et Claire n'a aucun recours. C'est précisément l'outil que les personas disent qu'elle rejettera.

**Pourquoi `UNREADABLE` fait exception.** Les deux autres motifs portent sur un **jugement** : le modèle pense que c'est un portfolio, Claire sait que c'est un CV de graphiste. Un humain tranche mieux. `UNREADABLE` ne porte sur aucun jugement : il n'y a pas de texte. Aucune décision humaine n'en fait apparaître. Proposer de contredire ce verdict-là serait offrir un bouton qui ne peut rien changer.

**Le verdict du modèle survit à la contradiction.** C'est le point structurant. `detectedType`, `confidence` et `isAtypical` gardent ce que le modèle a dit ; quatre colonnes enregistrent la décision humaine. Un score reste donc explicable jusqu'au bout — y compris lorsque l'explication est « une personne en a décidé autrement, à cette date, pour ce motif ».

Écraser le verdict aurait rendu le produit muet devant la seule question qui compte en cas de contestation : qui a décidé, la machine ou quelqu'un ?

**Où elle s'exerce.** Sur le détail du document, là où Claire lit la justification qu'elle conteste. Pas dans la file de réconciliation : celle-ci **bloque** l'analyse, alors qu'un document atypique ne bloque rien — il est déjà visible, déjà exclu, déjà expliqué.

**Traçabilité.** Toute contradiction est inscrite au journal d'audit sous l'action `ANALYSIS_VERDICT_OVERRIDDEN`.

_US-24 · à implémenter au lot 5_

---

## Tableau de synthèse

| Règle | Énoncé court                                              | US           | État          |
| ----- | --------------------------------------------------------- | ------------ | ------------- |
| RG-01 | Confiance sous le seuil → atypique                        | US-11        | Testée        |
| RG-02 | Type hors des attendus → atypique                         | US-05, US-11 | Testée        |
| RG-03 | Texte non extractible → atypique, sans appel au modèle    | US-11        | Testée        |
| RG-04 | Niveau 2 sur documents retenus uniquement                 | US-11, US-12 | Testée        |
| RG-05 | Score document = moyenne pondérée normalisée              | US-06, US-12 | Testée        |
| RG-06 | Score candidature = moyenne des retenus ; `null` si aucun | US-13, US-14 | Testée        |
| RG-07 | Décompression défensive : chemin, type, plafonds          | US-07        | Testée        |
| RG-08 | Un référentiel de comparaison par type attendu            | US-04, US-22 | Testée        |
| RG-09 | Identité lue dans le contenu, réconciliation si doute     | US-23        | À implémenter |
| RG-10 | Contradiction humaine d'un verdict, sauf `UNREADABLE`     | US-24        | À implémenter |
