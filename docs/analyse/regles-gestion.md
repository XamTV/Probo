# Règles de gestion

Ces règles sont **implémentées et testées** dans [`packages/shared/src/business-rules.ts`](../../packages/shared/src/business-rules.ts), et vérifiées par [`business-rules.test.ts`](../../packages/shared/src/business-rules.test.ts).

Ce document n'est pas une paraphrase du code : il porte l'énoncé métier et sa justification. Le code porte l'implémentation. Les deux se répondent par l'identifiant `RG-xx`, qui figure aussi dans les noms de tests — de sorte qu'une règle documentée, une règle implémentée et une règle testée soient traçables entre elles.

> **Règle de tenue.** Une règle ne change jamais ici sans changer dans le code et dans les tests, au cours de la même séance.

---

## RG-01 — Confiance insuffisante

**Énoncé.** Un document dont la confiance de classification est strictement inférieure au seuil défini sur la campagne est marqué **atypique**, motif `CONFIANCE_INSUFFISANTE`.

**Pourquoi.** Une classification incertaine n'est pas une information exploitable. Scorer un document dont on ignore la nature reviendrait à comparer un CV à une lettre de motivation sur les mêmes critères.

**Paramètre.** `campaign.confidenceThreshold`, entier de 0 à 100, par défaut **70**.

**Cas limite tranché.** Une confiance **égale** au seuil est acceptée. Le seuil est un minimum atteignable, pas une barre à dépasser.

_US-11 · testé_

---

## RG-02 — Type inattendu

**Énoncé.** Un document dont le type détecté ne figure pas parmi les types attendus par la campagne est marqué **atypique**, motif `TYPE_INATTENDU`.

**Pourquoi.** C'est le cas d'usage fondateur du produit : le portfolio glissé à la place d'un CV. Le fichier est parfaitement lisible et correctement classé — il n'a simplement rien à faire là.

**Conséquence de modélisation.** Le caractère atypique est **relatif à la campagne**, jamais absolu. Un portfolio est légitime dans une campagne d'école d'art et hors-sujet dans une campagne de MBA.

_US-05, US-11 · testé_

---

## RG-03 — Document illisible

**Énoncé.** Un document dont le texte n'a pas pu être extrait est marqué **atypique**, motif `ILLISIBLE`. **Aucun appel au modèle n'est effectué pour lui.**

**Pourquoi.** Sans texte, il n'y a rien à analyser. Appeler le modèle coûterait de l'argent et du quota pour produire une réponse inventée.

**Portée.** Couvre les PDF sans couche texte lorsque l'OCR est désactivé ou échoue, les fichiers corrompus, et les PDF protégés en lecture.

**Formulation à retenir.** Un scan non traité n'est pas une lacune du produit mais un cas atypique légitime : Probo signale qu'il ne peut pas se prononcer, plutôt que de deviner.

_US-11 · testé_

---

## Ordre de priorité des motifs

Quand plusieurs motifs s'appliquent, l'ordre est : **`ILLISIBLE`, puis `CONFIANCE_INSUFFISANTE`, puis `TYPE_INATTENDU`.**

`ILLISIBLE` vient d'abord parce qu'il est constaté avant tout appel au modèle.

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

Une entrée refusée n'interrompt pas l'import : elle est comptée dans `rejectedFileCount` et journalisée avec son motif.

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

**Historique.** Sous ce numéro figurait auparavant une règle sur l'origine d'un import Google Drive — un import ne pouvait citer qu'une `DriveConnection` enregistrée, jamais un identifiant de dossier reçu en requête. L'abandon de l'import Drive rend cette règle sans objet. Le raisonnement qui la fondait, sur la référence directe non sécurisée entre locataires, est conservé dans le journal de décisions.

_US-07 · à implémenter au lot 2_

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
| RG-07 | Décompression défensive : chemin, type, plafonds          | US-07        | À implémenter |
