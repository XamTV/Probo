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

> **Correction du 02/11/2026.** Ce document déduisait jusqu'ici le gel d'une « soutenance visée à six mois », faute de date de session connue : il annonçait le 15 janvier. La date réelle était disponible, elle n'avait simplement jamais été versée au dossier. Le calendrier s'ancre désormais sur le rendu, et non sur une durée choisie. Voir le journal de décisions.

> **État au 02/11/2026.** Le **lot 1 est livré** — authentification, cloisonnement, comptes, écran de connexion, tests de bout en bout contre une vraie base. Les six autres restent. Il s'est écoulé 33 % du calendrier pour un lot sur sept, mais les sept premières semaines ont produit l'intégralité du dossier de conception, qui pèse 70 des 277 heures. Restent **18 semaines avant le gel**, soit environ trois semaines par lot — ce qui tient, à condition que les lots 4 et 5, les plus lourds, ne débordent pas sur les autres.

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
| **7** | RGPD et exports                        | M-12, M-13, M-15       | US-17 à US-21                              | Isolables de la chaîne d'analyse, donc **coupables en dernier** si le calendrier dérape                                              |

**US-08 et US-09** ne figurent dans aucun lot : reportées hors périmètre v1 avec M-14, conservées pour la traçabilité de l'arbitrage.

## Ce que chaque lot doit produire

Un lot n'est fini que lorsque les quatre sont vrais :

1. Les critères d'acceptation de ses user stories passent.
2. Les règles de gestion qu'il met en œuvre sont **testées sous leur identifiant** `RG-xx`, repris dans le nom du test.
3. La CI est verte — formatage, lint, tests, build, validation du schéma Prisma.
4. Les livrables de conception qu'il périme sont à jour **dans la même séance** : le MCD et le MPD suivent leur migration, le plan de sécurisation gagne son entrée OWASP.

Le quatrième point est celui qu'on saute sous pression, et c'est celui qui produit un dossier reconstitué de mémoire au mois six.

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
