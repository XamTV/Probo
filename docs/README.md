# Documentation Probo

Ce dossier porte les livrables de conception du titre professionnel. **Il s'écrit au fil de l'eau**, pas au mois 6 : le mode d'échec classique du TP n'est pas une application ratée, c'est une bonne application avec un dossier reconstitué de mémoire en trois week-ends.

## L'ordre compte

Les livrables de conception ont une chaîne de dépendance, et la respecter est ce qui rend le dossier traçable : **besoins → user stories → cas d'utilisation → maquettes → MCD**.

Une première version du MCD avait été produite avant les user stories. Elle a été supprimée : ses entités n'étaient justifiées par aucun besoin documenté, et à la question « d'où sort cette entité ? » la seule réponse aurait été « d'une conversation ». Le modèle sera reconstruit après les maquettes.

Deux raisons de ne pas y revenir plus tôt. D'abord, chaque entité doit pouvoir se rattacher à une user story — c'est la vérification à faire avant de dessiner quoi que ce soit. Ensuite, **les maquettes modifient toujours le modèle** : dessiner les écrans révèle systématiquement des attributs manquants. Faire le MCD avant, c'est le faire deux fois.

> **Vérifié par l'expérience, le 03/09/2026.** Le maquettage a produit bien plus que des écrans : deux règles de gestion (RG-08, RG-09), deux entrées de périmètre, deux user stories, la suppression de l'entité `Criterion` et l'ajout de `ReferenceProfile`. Le niveau 2 n'avait aucun référentiel de comparaison documenté, et le regroupement par candidat se fiait au nom de fichier alors que tout le produit repose sur le fait que les noms de fichiers mentent. Un MCD dessiné avant cette étape aurait été à refaire. Voir le journal de décisions.

## État des livrables

| Livrable                                    | État                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `journal-decisions.md`                      | Écrit, tenu au fil de l'eau                                          |
| `analyse/cahier-des-charges.md`             | Écrit                                                                |
| `analyse/perimetre.md`                      | Écrit — MoSCoW, refus actés et reports datés                         |
| `analyse/personas.md`                       | Écrit — Claire, Marc, Sofia                                          |
| `analyse/user-stories.md`                   | Écrit — 24 US dont 2 reportées, 6 épopées                            |
| `analyse/regles-gestion.md`                 | Écrit — RG-01 à RG-10, dont 6 sous test                              |
| `analyse/cas-utilisation.md`                | Écrit — 16 CU dont 1 reporté, 2 scénarios                            |
| `analyse/plan-livraison.md`                 | Écrit — 7 lots, ordre et dépendances                                 |
| `maquettage/artboards/`                     | Écrit — 19 artboards, 16 CU, [canvas en ligne](maquettage/README.md) |
| `maquettage/charte-graphique.md`            | Écrit — extrait des artboards                                        |
| `maquettage/accessibilite-rgaa.md`          | Écrit — 4 engagements, 5 points à vérifier                           |
| `conception/diagramme-cas-utilisation.puml` | Écrit — 14 CU, CU-11 exclu car reporté                               |
| `conception/mcd.puml`, `mld.md`, `mpd.puml` | Écrit — reconstruits après les maquettes                             |
| `conception/ecarts-mcd-mpd.md`              | Écrit — 10 écarts, dont 1 signalé comme faiblesse                    |
| `conception/dictionnaire-donnees.md`        | Écrit — 11 tables, dérivé de `schema.prisma`                         |
| `conception/diagramme-classes.md`           | À produire                                                           |
| `conception/diagramme-sequence-analyse.md`  | À produire — meilleur atout de soutenance                            |
| `conception/diagramme-deploiement.md`       | À produire                                                           |
| `securite/plan-securisation.md`             | En cours — A01, A02, A07 écrites ; les autres au lot qui les produit |
| `securite/rgpd.md`                          | À produire                                                           |
| `tests/plan-de-tests.md`                    | À produire                                                           |
| `tests/cahier-de-recettes.md`               | À produire — dérivé des critères d'acceptation                       |
| `tests/jeu-essai/`                          | À constituer — 40 documents réels annotés                            |
| `veille/methode-et-sources.md`              | À produire                                                           |
| `veille/veille-anglophone.md`               | À produire                                                           |

## Deux règles de travail

**Le MCD se met à jour dans la même séance que la migration Prisma.** Jamais après. Un MCD dessiné une fois face à un schéma qui évolue pendant cinq mois produit exactement la divergence qu'un jury Merise cherche.

**Le MCD ne porte aucune technique.** Entités, associations verbalisées, cardinalités, identifiants — et rien d'autre. Les index, horodatages et empreintes n'apparaissent qu'au MLD et au MPD. Les écarts assumés sont consignés dans `conception/ecarts-mcd-mpd.md`.

## Le volet anglais

La compétence visée est la **compréhension** de documentation technique en anglais, pas la production. Écrire le code en anglais n'y répond pas, et un README traduit sera soupçonné d'être passé à la machine.

Le gisement le plus solide de ce projet reste la recherche sur les scopes Google Drive — `drive.file` contre `drive.readonly`, le mur de vérification, le mécanisme des comptes de service. Cette documentation n'existe qu'en anglais, et sa lecture a changé **deux** décisions successives : d'abord le choix du compte de service plutôt qu'OAuth, puis, une fois le coût complet de la fonctionnalité mesuré, l'abandon de l'import Drive lui-même. C'est le meilleur cas à présenter en soutenance, parce qu'il montre une lecture technique qui débouche sur un arbitrage de périmètre et non sur une ligne de code.

Vient ensuite la sécurité de la décompression d'archives — _zip slip_, liens symboliques, _zip bomb_ — dont la littérature de référence est anglophone (Snyk, OWASP) et qui fonde directement RG-07. Puis l'API Mistral et son mode JSON structuré, l'OWASP Top 10, et la documentation NestJS.
