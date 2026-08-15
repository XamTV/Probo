# Documentation Probo

Ce dossier porte les livrables de conception du titre professionnel. **Il s'écrit au fil de l'eau**, pas au mois 6 : le mode d'échec classique du TP n'est pas une application ratée, c'est une bonne application avec un dossier reconstitué de mémoire en trois week-ends.

## L'ordre compte

Les livrables de conception ont une chaîne de dépendance, et la respecter est ce qui rend le dossier traçable : **besoins → user stories → cas d'utilisation → maquettes → MCD**.

Une première version du MCD avait été produite avant les user stories. Elle a été supprimée : ses entités n'étaient justifiées par aucun besoin documenté, et à la question « d'où sort cette entité ? » la seule réponse aurait été « d'une conversation ». Le modèle sera reconstruit après les maquettes.

Deux raisons de ne pas y revenir plus tôt. D'abord, chaque entité doit pouvoir se rattacher à une user story — c'est la vérification à faire avant de dessiner quoi que ce soit. Ensuite, **les maquettes modifient toujours le modèle** : dessiner les écrans révèle systématiquement des attributs manquants. Faire le MCD avant, c'est le faire deux fois.

## État des livrables

| Livrable                                          | État                                             |
| ------------------------------------------------- | ------------------------------------------------ |
| `journal-decisions.md`                            | Écrit, tenu au fil de l'eau                      |
| `analyse/cahier-des-charges.md`                   | Écrit                                            |
| `analyse/perimetre.md`                            | Écrit — MoSCoW, avec les refus actés             |
| `analyse/personas.md`                             | Écrit — Claire, Marc, Sofia                      |
| `analyse/user-stories.md`                         | Écrit — 21 US, 6 épopées, critères d'acceptation |
| `analyse/regles-gestion.md`                       | Écrit — RG-01 à RG-07, dont 6 sous test          |
| `analyse/cas-utilisation.md`                      | Écrit — 14 CU, 2 scénarios détaillés             |
| `maquettage/prompt-claude-design.md`              | Écrit — prompt autoportant                       |
| **`maquettage/` — maquettes, charte, RGAA**       | **À produire — étape en cours**                  |
| `conception/mcd.*`, `mld.md`, `ecarts-mcd-mpd.md` | À reconstruire **après** les maquettes           |
| `conception/dictionnaire-donnees.md`              | À dériver de `schema.prisma`                     |
| `conception/diagramme-classes.md`                 | À produire                                       |
| `conception/diagramme-sequence-analyse.md`        | À produire — meilleur atout de soutenance        |
| `conception/diagramme-deploiement.md`             | À produire                                       |
| `securite/plan-securisation.md`                   | À produire — OWASP Top 10 point par point        |
| `securite/rgpd.md`                                | À produire                                       |
| `tests/plan-de-tests.md`                          | À produire                                       |
| `tests/cahier-de-recettes.md`                     | À produire — dérivé des critères d'acceptation   |
| `tests/jeu-essai/`                                | À constituer — 40 documents réels annotés        |
| `veille/methode-et-sources.md`                    | À produire                                       |
| `veille/veille-anglophone.md`                     | À produire                                       |

## Deux règles de travail

**Le MCD se met à jour dans la même séance que la migration Prisma.** Jamais après. Un MCD dessiné une fois face à un schéma qui évolue pendant cinq mois produit exactement la divergence qu'un jury Merise cherche.

**Le MCD ne porte aucune technique.** Entités, associations verbalisées, cardinalités, identifiants — et rien d'autre. Les index, horodatages et empreintes n'apparaissent qu'au MLD et au MPD. Les écarts assumés sont consignés dans `conception/ecarts-mcd-mpd.md`.

## Le volet anglais

La compétence visée est la **compréhension** de documentation technique en anglais, pas la production. Écrire le code en anglais n'y répond pas, et un README traduit sera soupçonné d'être passé à la machine.

Le gisement le plus solide de ce projet est la recherche sur les scopes Google Drive — `drive.file` contre `drive.readonly`, le mur de vérification, le mécanisme des comptes de service. Cette documentation n'existe qu'en anglais, et sa lecture a directement changé une décision d'architecture. Viennent ensuite l'API Mistral et son mode JSON structuré, l'OWASP Top 10, et la documentation NestJS.
