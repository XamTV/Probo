# Maquettage

## Où sont les maquettes

Les sources vivent dans [`artboards/`](artboards/) : **un fichier `.dc.html` par artboard**, plus `canvas.json` qui porte la mise en page, les pages et les notes.

Ce sont des maquettes, pas du code applicatif. Rien ici n'est compilé, importé par Angular, ni couvert par les tests. Elles servent de **spécification visuelle** et de point de départ pour écrire les vrais composants.

Le canvas assemblé est publié comme Artifact — consultable, annoté, exportable en PNG et PDF. Le fichier assemblé lui-même n'est pas versionné : il pèse deux mégaoctets d'éditeur embarqué et se régénère intégralement à partir de `artboards/`.

## Les 18 artboards

**Parcours — consultation.** Connexion · Classement dans ses trois états, liste pleine, analyse en cours, liste vide · Détail d'une candidature · Confirmation de suppression · Détail d'un document, en cas normal et en cas atypique.

**Import et réconciliation.** Avant dépôt · En cours · Réconciliation, file de cas et file vide · Terminé avec rejets · Archive refusée.

**Administration.** Coquille de navigation · Réglages de la campagne · Comptes · Journal d'audit.

## Couverture

Les quinze cas d'utilisation sont couverts, mais pas par quinze écrans. **CU-05, CU-06, CU-07 et CU-14** — analyser un document, signaler un atypique, calculer le score, purger — sont des cas **système** : aucun utilisateur ne les déclenche depuis un écran. Leurs effets se lisent sur les écrans de consultation.

Deux écrans n'existent pas et c'est délibéré : il n'y a **aucune interface candidat**. Sofia ne se connecte jamais à Probo, elle dépose son dossier sur le site de l'école. Ses droits contraignent le produit — suppression, purge, justifications conservées, journal d'audit — sans lui donner d'écran. Voir [`../analyse/personas.md`](../analyse/personas.md).

## Ce que le maquettage a changé au modèle

C'est l'intérêt principal de l'étape, et l'argument à porter en soutenance sur la chaîne `besoins → US → CU → maquettes → MCD`. Dessiner les écrans a révélé deux trous que cinq mois de documentation n'avaient pas fait apparaître :

- **RG-08** — le niveau 2 n'avait aucun référentiel de comparaison documenté. L'entité `Criterion` était orpheline ; `ReferenceProfile` la remplace.
- **RG-09** — le regroupement par candidat se fiait au nom de fichier, alors que tout le produit repose sur le fait que les noms de fichiers mentent.

Les deux ont produit des règles de gestion, des entrées de périmètre, des user stories et une migration. Un MCD dessiné avant cette étape aurait été à refaire. Voir [`../journal-decisions.md`](../journal-decisions.md), entrée du 03/09/2026.

## Régénérer le canvas

`injecte-nav.py` est la source de vérité de la coquille de navigation : il l'injecte dans tout artboard portant un marqueur `<!--NAV:Entrée active|persona-->`. La navigation ne se recopie donc jamais à la main — si elle change, elle change partout en une passe.

```bash
cd docs/maquettage/artboards
python3 injecte-nav.py
```

L'assemblage et la publication passent par la compétence de design de Claude Code, qui empaquette `artboards/` en une page unique.

## Reste à produire

- `charte-graphique.md` — couleurs, typographies, échelle d'espacement, inventaire des composants, à extraire des artboards
- `accessibilite-rgaa.md` — la position d'accessibilité, à partir des choix effectivement retenus

## Les cinq problèmes de conception

Ce sont les difficultés que le maquettage devait résoudre. Elles ont cadré le travail, et c'est à elles qu'il faut confronter les écrans pour juger s'ils tiennent.

1. **Signaler un document atypique sans dramatiser.** Ce n'est ni une erreur système ni une faute du candidat. Ça doit se voir au premier coup d'œil dans une liste de 400 lignes, sans transformer l'écran en tableau d'alarmes.

2. **Distinguer « pas de score » de « mauvais score ».** Une candidature dont aucun document n'est exploitable n'a **pas** de score ; elle ne vaut pas zéro. Zéro la classerait en dernier et signifierait « mauvaise candidature ». Ces candidatures sortent du classement et forment un groupe à part. **C'est la distinction la plus importante de toute l'interface.**

3. **Présenter deux niveaux d'analyse en séquence.** Sur le détail d'un document, on doit comprendre que le niveau 2 dépend du niveau 1 — et, quand il n'a pas eu lieu, comprendre pourquoi sans avoir à le déduire.

4. **Afficher trois sous-scores et leurs justifications sans saturer.** Les chiffres se comparent d'un coup d'œil, les justifications se lisent. Deux besoins, deux traitements visuels.

5. **Suivre le traitement d'un lot de 200 documents.** Plusieurs minutes, document par document, avec des échecs partiels possibles. Claire doit savoir ce qui avance, ce qui a échoué et pourquoi, sans rester devant l'écran.

Les notes posées sur le canvas rattachent chaque parti pris au problème qu'il résout.

## Ce que porte le dossier de maquettage

| Fichier                                          | Rôle                                                       |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [`artboards/`](artboards/)                       | Les 19 écrans, source de vérité                            |
| [`charte-graphique.md`](charte-graphique.md)     | Couleurs, typographie, composants — extraits des artboards |
| [`accessibilite-rgaa.md`](accessibilite-rgaa.md) | La position d'accessibilité, et ce qu'elle ne couvre pas   |

Un `prompt-claude-design.md` a existé jusqu'au 05/10/2026 : le cahier des charges qui a produit les écrans. La moitié de son contenu décrivait les écrans un par un, ce que les artboards montrent mieux ; l'autre moitié est devenue les deux documents ci-dessus. Voir le journal de décisions.

## Décisions visuelles à connaître

- **Thème clair uniquement.** Le thème sombre n'a jamais figuré au périmètre ; le proposer en maquette aurait créé un écart à justifier entre le dessin et l'application.
- **IBM Plex Sans et IBM Plex Mono**, chiffres tabulaires pour que les scores s'alignent en colonne. Le front est encore en `system-ui` : c'est un choix des maquettes, pas une reprise de l'existant.
- **Un seul accent**, `#294B8A`. Les couleurs sémantiques en sont distinctes : ocre `#B07818` pour l'atypique, gris neutre pour le non évaluable, rouge `#A32B22` pour l'erreur et la suppression.
- **L'information n'est jamais portée par la couleur seule.** Le nombre de documents atypiques est un chiffre ; le filet ocre en bord de ligne ne fait que le redoubler.
