# Plan de livraison

Dans quel ordre le produit se construit, et pourquoi cet ordre-là. Le [périmètre](perimetre.md) dit **ce qui** sera fait ; ce document dit **quand**, et ce qui impose la séquence.

Il existe parce que l'ordre de réalisation n'est pas une préférence : il est dicté par des dépendances techniques qu'on ne peut pas contourner sans écrire du code intestable.

## La contrainte de calendrier

Démarrage le **15 août 2026**, soutenance visée à six mois. La [règle de gel](perimetre.md#règle-de-gel) interdit toute nouvelle fonctionnalité **à partir du 15 janvier 2027** : le dernier mois va au durcissement, au jeu d'essai, à la finalisation du dossier et aux répétitions.

Il reste donc **quatorze semaines de construction** pour dix-sept fonctionnalités « doit être fait ». C'est tenable, mais la marge de vingt heures sur 277 est déjà affectée aux imprévus — pas à des lots supplémentaires.

> **État au 06/10/2026.** Le socle technique est prêt depuis le 15 août, le dossier de conception est complet sur tout ce qu'il peut produire seul, et **l'application expose une seule route**, la sonde de santé. Les sept semaines écoulées sont allées à l'analyse, aux maquettes et au modèle de données. Le reste doit aller au code.

## Pourquoi des lots et non une user story à la fois

Vingt-quatre livraisons pour un développeur seul, c'est de la cérémonie : chacune demanderait sa branche, sa fusion et sa vérification pour un gain nul. Les lots regroupent ce qui **se teste ensemble** et ce qui **n'a pas de sens séparément** — on ne livre pas une authentification sans son cloisonnement, ni un niveau 2 sans le référentiel auquel il compare.

Un lot est donc l'unité de livraison : une branche, une pull request, une fusion.

## Les sept lots

| Lot   | Contenu                                | Périmètre              | User stories               | Ce qui impose cette place                                                                                                            |
| ----- | -------------------------------------- | ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | Authentification et cloisonnement      | M-01, M-11             | US-01, US-02, US-03        | Rien n'est testable sans un utilisateur et un établissement. Toute requête ultérieure est filtrée par `institutionId`                |
| **2** | Campagne et référentiel                | M-02, M-16             | US-04, US-05, US-06, US-22 | Un lot d'import vise une campagne ; le niveau 2 compare à un référentiel. Les deux doivent exister avant d'importer quoi que ce soit |
| **3** | Import ZIP                             | M-03                   | US-07                      | La porte d'entrée unique. RG-07 est assez précise pour être codée et testée sans maquette                                            |
| **4** | Extraction, niveau 1 et réconciliation | M-04, M-05, M-17       | US-10, US-23               | Le cœur du produit. La réconciliation s'intercale entre niveau 1 et niveau 2, elle ne peut pas être repoussée après                  |
| **5** | Atypiques, niveau 2 et agrégation      | M-06, M-07, M-08, M-18 | US-11, US-12, US-13, US-24 | RG-01 à RG-06 sont déjà écrites et testées dans `packages/shared` ; il reste à les câbler au pipeline                                |
| **6** | Écrans de consultation                 | M-09, M-10             | US-14, US-15, US-16        | Les maquettes sont la spécification. Rien à concevoir, tout à implémenter                                                            |
| **7** | RGPD et exports                        | M-12, M-13, M-15       | US-17 à US-21              | Isolables de la chaîne d'analyse, donc **coupables en dernier** si le calendrier dérape                                              |

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

Pas de branche par commit, pas de `develop`, pas de GitFlow. Un développeur seul sur six mois n'a besoin que de `main` et d'une branche de lot vivante. Toute cérémonie supplémentaire coûte du temps que le code n'a pas.

**`main` reste toujours déployable.** C'est la seule règle non négociable du flux.

## Suivi

Les user stories sont ouvertes comme **issues GitHub**, une par US, groupées par **jalon** correspondant au lot, étiquetées par épopée. Elles ont été créées depuis [`user-stories.md`](user-stories.md).

> **Les documents font foi, pas les issues.** Une issue est une copie de confort pour suivre l'avancement. Quand une user story change, elle change ici d'abord ; l'issue suit, ou diverge sans que personne ne s'en aperçoive. C'est la même règle que pour les maquettes et les schémas rendus.
