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

## RG-07 — Origine d'un import Drive

**Énoncé.** Un import Google Drive ne peut citer qu'une connexion préalablement **enregistrée** par l'établissement. Un identifiant de dossier reçu dans une requête n'est jamais utilisé.

**Pourquoi.** Le compte de service a accès à tous les dossiers qui lui ont été partagés, **tous établissements confondus**. Accepter un identifiant fourni par le client permettrait à l'établissement A de lire le dossier de candidatures de l'établissement B en devinant ou en interceptant son identifiant. C'est une référence directe non sécurisée, catégorie _Broken Access Control_ de l'OWASP Top 10.

**Contre-mesure.** L'entité `DriveConnection` matérialise l'autorisation. L'API n'accepte qu'un identifiant de connexion, dont l'appartenance à l'établissement de l'appelant est vérifiée avant tout accès à Drive.

**Portée de la règle.** Elle est structurelle, pas seulement applicative : elle contraint le modèle de données. C'est la raison d'être de l'entité.

_US-08, US-09 · à implémenter au lot 2_

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
| RG-07 | Import Drive depuis une connexion enregistrée uniquement  | US-08, US-09 | À implémenter |
