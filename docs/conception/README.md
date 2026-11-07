# Conception

Les schémas du dossier, écrits en **PlantUML** et versionnés comme source.

## Pourquoi du texte et non des images

Un PNG exporté d'un outil graphique diverge au premier changement de schéma, et personne ne s'en aperçoit. Une source PlantUML se relit en diff : quand `schema.prisma` bouge, on voit exactement ce que le diagramme doit suivre.

C'est ce qui rend tenable la règle de travail du dossier — **le MCD se met à jour dans la même séance que la migration Prisma**, jamais après.

## Rendre les schémas

```bash
brew install plantuml
plantuml -tsvg docs/conception/*.puml
```

Les images produites ne sont pas versionnées : elles se régénèrent, et un SVG committé à côté de sa source est une seconde vérité à entretenir. Les exports partent dans le dossier professionnel, pas dans le dépôt.

L'extension PlantUML de VS Code donne un aperçu en direct, utile pendant l'écriture.

## État

| Schéma                          | Fichier                           | État                                                        |
| ------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Cas d'utilisation               | `diagramme-cas-utilisation.puml`  | Écrit — 14 CU, CU-11 exclu car reporté                      |
| MCD Merise                      | `mcd.puml`                        | Écrit — 10 entités, 13 associations, aucune technique       |
| MLD                             | `mld.md`, `mld.puml`              | Écrit — 10 relations, sans table de jonction                |
| MPD                             | `mpd.puml`                        | Écrit — 10 tables, index et comportements de suppression    |
| Écarts MCD / MPD                | `ecarts-mcd-mpd.md`               | Écrit — 11 écarts, aucun signalé comme faiblesse            |
| Dictionnaire de données         | `dictionnaire-donnees.md`         | Écrit — 10 tables, dérivé de schema.prisma                  |
| Diagramme de classes            | `diagramme-classes.puml`          | Écrit                                                       |
| Diagramme de séquence — analyse | `diagramme-sequence-analyse.puml` | À produire **pendant** le lot d'implémentation de l'analyse |
| Diagramme de déploiement        | `diagramme-deploiement.puml`      | Écrit                                                       |

## Deux règles reprises de `docs/README.md`

**Le MPD suit la migration, dans la même séance.** `mpd.puml` est une représentation lisible de `schema.prisma`, pas une seconde source : il porte la date de la migration à laquelle il correspond, et se met à jour avec elle.

**Le MCD ne porte aucune technique.** Entités, associations verbalisées, cardinalités, identifiants — rien d'autre. Les index, horodatages et empreintes n'apparaissent qu'au MLD et au MPD, et les écarts assumés sont consignés dans `ecarts-mcd-mpd.md`.

**Le diagramme de séquence s'écrit pendant le code, pas après.** Il est désigné comme le meilleur atout de soutenance : il n'a cette valeur que s'il décrit ce que le code fait réellement.

## Ce que le diagramme de cas d'utilisation porte déjà

Deux relations méritent d'être lues : `CU-04 → CU-15 → CU-05` dit que l'import **ne peut pas** lancer l'analyse sans avoir levé les doutes d'identité (RG-09), et `CU-06` étend `CU-05` parce que le signalement d'un document atypique n'a lieu que si le niveau 1 l'écarte.

L'esquisse ASCII de [`../analyse/cas-utilisation.md`](../analyse/cas-utilisation.md) reste la version de travail. Les deux se mettent à jour ensemble.
