# Position d'accessibilité

Ce que les maquettes retiennent du RGAA, et ce qu'elles ne prétendent pas couvrir. Écrit à partir des choix **effectivement faits** dans les [artboards](artboards/), pas d'une liste de bonnes intentions.

## Le périmètre réel

Probo n'est pas un service public et n'est donc pas soumis à l'obligation légale de conformité RGAA. La référence est reprise parce qu'elle est la grille française de référence, et parce que l'outil est utilisé plusieurs heures d'affilée par des équipes où la diversité des situations est la norme.

**Aucune déclaration de conformité ne sera produite.** Revendiquer un niveau sans audit serait une affirmation invérifiable — le genre que ce dépôt s'interdit.

## Les quatre engagements tenus dans les maquettes

### 1. L'information n'est jamais portée par la seule couleur

C'est l'engagement le plus structurant, et il se vérifie écran par écran.

Un document atypique est signalé par **trois** canaux simultanés : un filet ocre en bord de ligne, un **compte chiffré** dans sa colonne, et un libellé en toutes lettres au détail. Retirez la couleur, l'information subsiste entièrement.

Même traitement pour l'avancement d'un lot — analysés, atypiques, en erreur portent chacun une pastille **et** un nombre **et** un mot.

### 2. Contraste

Le texte principal `#14181D` sur `#FFFFFF` dépasse largement le minimum de 4,5:1. Le texte secondaire `#545C66` et tertiaire `#6C757F` le satisfont aussi.

**Deux réserves honnêtes.** Le texte atténué `#9AA1A9` sur blanc est sous le seuil ; il n'est employé que pour des valeurs absentes — un tiret, « aucun score » — jamais pour une information que l'utilisateur doit lire. Et les mesures ci-dessus sont des estimations de conception : **aucun contrôle automatisé n'a été passé**. Il devra l'être sur l'application réelle, pas sur les maquettes.

### 3. Focus visible

Tout élément interactif porte un état de focus explicite : bordure à l'accent `#294B8A` doublée d'un anneau `#C9D6EE` à 2 px, décalé de 1 px. Le champ de recherche du classement le montre dans son état actif.

Le contour par défaut du navigateur n'est jamais supprimé sans être remplacé.

### 4. Structure réelle, pas simulée

Les tableaux utilisent de vrais `<th scope="col">`, pas des `<div>` stylés. Les titres suivent une hiérarchie `h1` → `h2` sans saut. Les libellés de formulaire sont rattachés à leur champ. Les colonnes d'action sans en-tête visible portent un intitulé réservé aux lecteurs d'écran.

## La langue, qui relève aussi du RGAA

L'attribut `lang` du document suit la langue active, et ce n'est pas cosmétique : les lecteurs d'écran en tirent leur prononciation. Un texte français lu avec une phonétique anglaise est inexploitable.

C'est `LocaleService` qui en porte la responsabilité, côté application — voir le README. Le sélecteur de langue est présent en pied de navigation, donc **accessible depuis n'importe quel écran**.

## Ce qui n'est pas traité, et doit l'être sur l'application

Les maquettes sont des images : elles ne peuvent démontrer ni la navigation au clavier, ni le comportement réel d'un lecteur d'écran, ni la gestion du focus à l'ouverture d'une modale.

| À vérifier sur l'application                      | Pourquoi une maquette ne suffit pas  |
| ------------------------------------------------- | ------------------------------------ |
| Parcours clavier complet, ordre de tabulation     | Dépend du DOM produit, pas du dessin |
| Piège de focus dans la modale de suppression      | Comportement, non apparence          |
| Annonce des changements d'état en cours d'analyse | Demande des régions live             |
| Contraste mesuré, pas estimé                      | Demande un outil sur le rendu réel   |
| Zoom à 200 % sans perte d'information             | Demande un navigateur                |

Ces points rejoindront le plan de tests.

## Une tension assumée

L'outil est **dense par conception** : le classement affiche jusqu'à 400 lignes, et un tableau aéré obligerait Claire à faire défiler sans fin. Une densité élevée sert la tâche et dessert la lisibilité à faible vision.

Le compromis retenu : densité en tableau, **respiration dans les écrans de détail**, et un sélecteur de densité sur le classement — compact ou confortable — qui laisse le choix à l'utilisatrice plutôt que de le trancher à sa place.
