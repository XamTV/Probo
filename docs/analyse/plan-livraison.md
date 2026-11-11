# Plan de livraison

Dans quel ordre le produit se construit, et pourquoi cet ordre-là. Le [périmètre](perimetre.md) dit **ce qui** sera fait ; ce document dit **quand**, et ce qui impose la séquence.

Il existe parce que l'ordre de réalisation n'est pas une préférence : il est dicté par des dépendances techniques qu'on ne peut pas contourner sans écrire du code intestable.

## La contrainte de calendrier

**La soutenance a lieu le 15 avril 2027, et le dossier se rend le 8 avril.** Le point fixe est le **rendu**, pas la soutenance : le dossier doit être terminé une semaine avant le passage, et c'est de cette date que tout se lit à rebours.

| Jalon                   | Date          | Ce qui s'y joue                                                                |
| ----------------------- | ------------- | ------------------------------------------------------------------------------ |
| Démarrage               | 15/08/2026    | Socle technique                                                                |
| **Gel des ajouts**      | 08/03/2027    | Plus aucune fonctionnalité — voir la [règle de gel](perimetre.md#règle-de-gel) |
| Durcissement et dossier | 08/03 → 08/04 | Jeu d'essai, cahier de recettes, finalisation du dossier                       |
| **Rendu du dossier**    | 08/04/2027    | Échéance contraignante                                                         |
| Répétitions             | 08/04 → 15/04 | Plus rien ne s'écrit : on répète                                               |
| **Soutenance**          | 15/04/2027    |                                                                                |

Soit **huit mois**, dont un dernier mois sans aucun ajout et une dernière semaine sans aucune écriture.

### Les deux points de contrôle

Fixés le 11/11/2026, pour que la décision de couper ne se prenne pas en février, sous pression — voir le journal de décisions.

| Date           | Ce qui doit être vrai | Sinon                                                           |
| -------------- | --------------------- | --------------------------------------------------------------- |
| **18/01/2027** | Le lot 4 est fusionné | M-13 et M-15 sont coupés d'office                               |
| **15/02/2027** | Le lot 5 est fusionné | Le lot 6 ne livre que les écrans dont la démonstration a besoin |

**M-12 n'est jamais coupé.** La purge à 90 jours et le journal d'audit sont une obligation RGPD pour un produit qui traite des candidatures. Couper reste un changement de périmètre : il s'inscrit au journal à sa date.

> **Correction du 02/11/2026.** Ce document déduisait jusqu'ici le gel d'une « soutenance visée à six mois », faute de date de session connue : il annonçait le 15 janvier. La date réelle était disponible, elle n'avait simplement jamais été versée au dossier. Le calendrier s'ancre désormais sur le rendu, et non sur une durée choisie. Voir le journal de décisions.

> **État au 06/11/2026.** Les **lots 1 et 2 sont livrés** — authentification, cloisonnement et comptes d'un côté ; campagne, types de documents attendus, seuil, pondération et profil de référence de l'autre. Le lot 2 a soldé en passant la dette du lot 1 : le **lien d'invitation** existe, et un compte sans mot de passe l'admet désormais dans son état plutôt que de le masquer. Restent cinq lots et **environ 17 semaines avant le gel**, soit un peu plus de trois semaines par lot — ce qui tient, à condition que les lots 4 et 5, les plus lourds, ne débordent pas sur les autres.
>
> **US-22 reste ouverte**, scindée le 02/11 : son profil décrit est livré, son document de référence déposé attend la chaîne d'extraction du lot 4. Un critère d'US-02 n'est pas davantage démontrable avant le lot 3, faute de lots d'import à rendre visibles.

## Pourquoi des lots et non une user story à la fois

Vingt-quatre livraisons pour un développeur seul, c'est de la cérémonie : chacune demanderait sa branche, sa fusion et sa vérification pour un gain nul. Les lots regroupent ce qui **se teste ensemble** et ce qui **n'a pas de sens séparément** — on ne livre pas une authentification sans son cloisonnement, ni un niveau 2 sans le référentiel auquel il compare.

Un lot est donc l'unité de livraison : une branche, une pull request, une fusion.

## Les sept lots

| Lot   | Contenu                                | Périmètre              | User stories                               | Ce qui impose cette place                                                                                                            |
| ----- | -------------------------------------- | ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | Authentification et cloisonnement      | M-01, M-11             | US-01, US-02, US-03                        | Rien n'est testable sans un utilisateur et un établissement. Toute requête ultérieure est filtrée par `institutionId`                |
| **2** | Campagne et référentiel                | M-02, M-16             | US-04, US-05, US-06, US-22 (profil décrit) | Un lot d'import vise une campagne ; le niveau 2 compare à un référentiel. Les deux doivent exister avant d'importer quoi que ce soit |
| **3** | Import ZIP                             | M-03                   | US-07                                      | La porte d'entrée unique. RG-07 est assez précise pour être codée et testée sans maquette                                            |
| **4** | Extraction, niveau 1 et réconciliation | M-04, M-05, M-17       | US-10, US-23, US-22 (document déposé)      | Le cœur du produit. La réconciliation s'intercale entre niveau 1 et niveau 2, elle ne peut pas être repoussée après                  |
| **5** | Atypiques, niveau 2 et agrégation      | M-06, M-07, M-08, M-18 | US-11, US-12, US-13, US-24                 | RG-01 à RG-06 sont déjà écrites et testées dans `packages/shared` ; il reste à les câbler au pipeline                                |
| **6** | Écrans de consultation                 | M-09, M-10             | US-14, US-15, US-16                        | Les maquettes sont la spécification. Rien à concevoir, tout à implémenter                                                            |
| **7** | RGPD et exports                        | M-12, M-13, M-15       | US-17 à US-21                              | Isolables de la chaîne d'analyse. Les exports sont **coupables** si le calendrier dérape ; M-12 ne l'est pas                         |

**US-08 et US-09** ne figurent dans aucun lot : reportées hors périmètre v1 avec M-14, conservées pour la traçabilité de l'arbitrage.

## Ce que chaque lot doit produire

Un lot n'est fini que lorsque les cinq sont vrais :

1. Les critères d'acceptation de ses user stories passent.
2. Les règles de gestion qu'il met en œuvre sont **testées sous leur identifiant** `RG-xx`, repris dans le nom du test.
3. La CI est verte — formatage, lint, tests, build, validation du schéma Prisma.
4. Les livrables de conception qu'il périme sont à jour **dans la même séance** : le MCD et le MPD suivent leur migration, le plan de sécurisation gagne son entrée OWASP.
5. Le **cahier de recettes** porte les recettes de ses user stories, dérivées de leurs critères d'acceptation. Les lots 1 à 3, écrits avant cette règle du 11/11/2026, sont rattrapés.

Les quatrième et cinquième points sont ceux qu'on saute sous pression, et ce sont eux qui produisent un dossier reconstitué de mémoire au dernier mois.

## Branches et pull requests

**Une branche par lot**, nommée `feat/lot-N-slug` :

```
feat/lot-1-auth-cloisonnement
feat/lot-2-campagne-referentiel
feat/lot-3-import-zip
```

**Une pull request vers `main`**, fusionnée quand la CI est verte. Le titre porte les identifiants, pour que la traçabilité que le dossier revendique soit visible dans Git et pas seulement dans les documents :

```
feat(api): lot 1 — authentification et cloisonnement (M-01, M-11)
```

### Pourquoi une PR alors qu'on est seul

Pas pour la revue — se relire par principe est du théâtre. Pour trois choses que la PR donne gratuitement :

- **La CI tourne avant la fusion.** Elle se déclenche déjà sur `pull_request` ; aujourd'hui elle ne sert qu'après coup, et signale une régression une fois qu'elle est sur `main`.
- **Un endroit pour décrire le lot**, qui survit mieux qu'un message de commit isolé.
- **Un historique qui montre une méthode**, ce qu'un jury regarde.

### Ce que ce flux ne doit pas devenir

Pas de branche par commit, pas de `develop`, pas de GitFlow. Un développeur seul sur huit mois n'a besoin que de `main` et d'une branche de lot vivante. Toute cérémonie supplémentaire coûte du temps que le code n'a pas.

**`main` reste toujours déployable.** C'est la seule règle non négociable du flux.

## Suivi

Les user stories sont ouvertes comme **issues GitHub**, une par US, groupées par **jalon** correspondant au lot, étiquetées par épopée. Elles ont été créées depuis [`user-stories.md`](user-stories.md).

> **Les documents font foi, pas les issues.** Une issue est une copie de confort pour suivre l'avancement. Quand une user story change, elle change ici d'abord ; l'issue suit, ou diverge sans que personne ne s'en aperçoive. C'est la même règle que pour les maquettes et les schémas rendus.

**Une issue non fermée n'est pas une divergence neutre.** Le paragraphe ci-dessus autorisait la copie à diverger, et le 05/11/2026 les vingt-quatre issues étaient ouvertes alors que le lot 1 tournait en production depuis trois semaines. Une user story qui diverge en silence est une inexactitude ; une issue ouverte **affirme activement** que rien n'a été livré, à qui regarde l'onglet plutôt que le dossier.

La fermeture ne se fait donc pas à la main : le corps de la pull request porte une ligne `Closes #n` par US livrée, et la fusion ferme l'issue. C'est le gabarit [`.github/pull_request_template.md`](../../.github/pull_request_template.md) qui le rappelle au seul moment où la question se pose. Une US livrée en partie se cite sans `Closes`, en disant ce qui reste.
