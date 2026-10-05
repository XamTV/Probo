# Charte graphique

Extraite des [artboards](artboards/), qui font foi. Les valeurs ci-dessous sont celles réellement employées, relevées dans les sources — pas une intention.

**Règle de tenue.** Quand une valeur change dans les maquettes, elle change ici. Si les deux divergent, ce sont les artboards qui ont raison, et ce document qui est à corriger.

## La direction, en une phrase

Outil professionnel de travail, consulté plusieurs heures d'affilée. Sobre, dense mais respirable, sans décoration. **La lisibilité prime sur l'originalité.**

Sont écartés sans discussion : dégradés, ombres portées prononcées, coins très arrondis, emoji en repères de section, esthétique de tableau de bord marketing.

**Thème clair uniquement.** Le thème sombre n'a jamais figuré au périmètre ; le dessiner aurait créé un écart à justifier entre la maquette et l'application.

## Typographie

| Usage                                    | Fonte                                                           |
| ---------------------------------------- | --------------------------------------------------------------- |
| Interface                                | **IBM Plex Sans**, replis `Segoe UI`, `system-ui`, `sans-serif` |
| Chiffres, noms de fichiers, identifiants | **IBM Plex Mono**, replis `ui-monospace`, `monospace`           |

Tout nombre comparable — score, rang, confiance, taille, décompte — est en **chiffres tabulaires** (`font-variant-numeric: tabular-nums`). Sans cela, les scores d'une colonne ne s'alignent pas et la liste cesse d'être balayable, ce qui est sa seule raison d'être.

### Échelle de tailles

| px       | Usage                                                             |
| -------- | ----------------------------------------------------------------- |
| 24       | Titre de page                                                     |
| 17–19    | Titre de section, score mis en avant                              |
| 15       | Score en ligne de tableau                                         |
| 14–14.5  | Titre de carte, cellule de tableau                                |
| 13–13.5  | Texte courant, libellé de formulaire                              |
| **12.5** | Texte secondaire — **la taille la plus fréquente de l'interface** |
| 11–12    | Mention, métadonnée, aide                                         |
| 10.5     | Étiquette en capitales                                            |

Trois graisses seulement : **400** pour le texte courant, **500** pour ce qui doit ressortir dans une ligne, **600** pour les titres et les étiquettes.

## Couleurs

### Neutres

| Jeton            | Valeur               | Usage                               |
| ---------------- | -------------------- | ----------------------------------- |
| Fond de page     | `#FBFBFA`            | Blanc cassé légèrement chaud        |
| Surface          | `#FFFFFF`            | Cartes, tableaux, champs            |
| Surface discrète | `#FCFCFB`            | Pieds de carte, lignes de total     |
| Texte principal  | `#14181D`            |                                     |
| Texte secondaire | `#545C66`            |                                     |
| Texte tertiaire  | `#6C757F`            | Étiquettes, mentions                |
| Texte atténué    | `#9AA1A9`            | Valeurs absentes, actions inactives |
| Bordure          | `#E2E5E9`            |                                     |
| Bordure marquée  | `#D7DBE0`, `#A9B1BA` | Champs, boutons secondaires         |
| Séparateur       | `#EAECEF`            | Lignes de tableau                   |
| Piste            | `#E7EAEE`            | Fond des barres de score            |

### Navigation, sur fond sombre

`#1B2027` fond · `#262C34` carte de campagne · `#313A45` entrée active · `#333B45` bordures · `#D4D8DE` texte · `#7C858F` étiquettes

### Accent, unique

**`#294B8A`** — un seul accent, pour l'interactif et la sélection. `#1B3565` au survol des liens, `#C9D6EE` pour l'anneau de focus, `#F4F6FA` en fond d'information.

### Couleurs sémantiques, distinctes de l'accent

| Sens                | Couleur                    | Fond                 | Bordure   |
| ------------------- | -------------------------- | -------------------- | --------- |
| Atypique            | `#B07818`, texte `#8A5B14` | `#FBF3E4`, `#FDF8EF` | `#E8D5AE` |
| Validé, terminé     | `#2F7D5E`, texte `#24614A` | `#E4F0EA`            | `#B6D8C7` |
| Erreur, suppression | `#A32B22`, texte `#8A241D` | `#FCF2F1`, `#FDF6F5` | `#E8C4C0` |
| Non évaluable       | Les neutres, sans teinte   |                      |           |

**Le non évaluable n'a pas de couleur, et c'est délibéré.** Lui en donner une l'aurait rangé parmi les états à problème, alors qu'il signifie « rien à évaluer ».

## Formes

Rayons : **4 px** pour les contrôles — boutons, champs, étiquettes ; **5–6 px** pour les cartes et les conteneurs ; **3 px** pour les pastilles ; **2 px** pour les barres de progression.

Une seule ombre dans tout le lot, sur les menus flottants : `0 4px 14px rgba(20, 24, 29, 0.09)`. Les modales montent à `0 16px 44px rgba(20, 24, 29, 0.26)` — elles doivent décoller.

## Composants

**Coquille de navigation** — 232 px, fond sombre, posée une fois et injectée partout par [`artboards/injecte-nav.py`](artboards/injecte-nav.py). Jamais recopiée à la main.

**Carte** — surface blanche, bordure `#E2E5E9`, rayon 6 px, en-tête à `15px 20px` séparé par `#EAECEF`.

**Tableau** — en-têtes en capitales 11 px, interlettrage `0.07em`, couleur `#6C757F`, soulignés par `#D7DBE0`. Cellules à `11px 16px`, séparateurs `#EAECEF`, survol `#F7F8FA`.

**Bouton primaire** — fond `#294B8A`, texte blanc, hauteur 34 px. Un seul par écran, **dans l'en-tête, à droite, en dernier**. Les modales font exception : leurs actions vivent en pied.

**Bouton secondaire** — fond blanc, bordure `#A9B1BA`, même hauteur.

**Score** — nombre en mono tabulaire suivi d'une piste de 62 × 4 px remplie à l'accent.

**Signalement d'atypie** — filet de 2 px en bord de ligne (`inset 2px 0 0 #B07818`) **plus** un compte chiffré. Jamais l'un sans l'autre.

**Icônes** — SVG en trait uniquement, grille 24, épaisseur `1.8`–`2.2`, extrémités arrondies. Tailles 11 à 17 px selon le contexte. Aucun emoji, aucune icône pleine.

## Ce que cette charte doit au raisonnement

Trois choix ne se déduisent pas du goût mais des règles de gestion :

- **Les chiffres tabulaires** existent parce que le classement se balaie, pas se lit.
- **Le filet ocre doublé d'un chiffre** existe parce que le RGAA interdit de porter une information par la seule couleur, et parce que RG-01 à RG-03 exigent un signalement visible sans transformer l'écran en tableau d'alarmes.
- **L'absence de couleur sur le non évaluable** existe parce que RG-06 distingue « rien à évaluer » de « mauvais », et qu'une teinte d'alerte aurait effacé cette distinction.
