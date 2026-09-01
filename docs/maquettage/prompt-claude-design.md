# Prompt de maquettage

Prompt autoportant à transmettre à un outil de design. Il ne suppose aucune connaissance préalable du projet.

**Comment l'utiliser.** Copier le bloc ci-dessous intégralement. Demander les écrans **un par un** plutôt que les six d'un coup : la qualité chute nettement au-delà de deux écrans par requête. Commencer par le classement, qui fixe le système visuel réutilisé ensuite.

**Ce qui revient ensuite dans le dossier.** Les maquettes servent de spécification visuelle _et_ de point de départ des composants Angular. Prévoir en plus une trace de wireframe basse fidélité — Excalidraw suffit — pour montrer l'étape de conception amont.

---

## Prompt à copier

```text
Tu conçois les maquettes d'une application web professionnelle. Voici le contexte
complet ; ne suppose rien au-delà.

## Le produit

Probo analyse en masse les candidatures reçues par les écoles et organismes de
formation. Pour chaque fichier déposé, il répond à deux questions dans l'ordre :
est-ce bien le bon type de document, et à quel point correspond-il aux critères
de la campagne ?

Le parti pris central : **deux jugements séparés**.

- Niveau 1 — la nature. « Qu'est-ce que ce document ? » Le système classe le
  fichier (CV, lettre de motivation, lettre de recommandation, portfolio, autre)
  avec une confiance de 0 à 100. Si la confiance est trop basse, si le type
  n'était pas attendu, ou si le texte est illisible, le document est marqué
  ATYPIQUE et n'entre dans AUCUN calcul de score.
- Niveau 2 — la pertinence. Uniquement sur les documents retenus au niveau 1.
  Trois sous-scores de 0 à 100 — adéquation, clarté, qualité formelle — chacun
  accompagné d'une justification écrite.

L'outil ordonne et justifie. Il ne décide pas. Un score n'est jamais affiché nu :
il porte toujours sa raison.

## L'utilisatrice

Claire, responsable des admissions dans une école privée. Elle traite 400 à 700
candidatures par campagne. Bonne utilisatrice bureautique, elle n'installe rien,
ne lit aucune documentation, et abandonne un outil qui demande plus de dix
minutes de prise en main.

Elle est méfiante envers l'IA, et elle a raison. Elle acceptera un outil qui
classe et explique, jamais un outil qui tranche. Elle travaille sur grand écran,
souvent plusieurs heures d'affilée.

## Langue et vocabulaire

L'interface est bilingue français / anglais, le français étant la langue par
défaut. Conçois les maquettes en français, mais prévois qu'un libellé anglais
peut être 20 à 30 % plus court ou plus long : évite les largeurs fixes calées
sur la longueur exacte d'un mot français.

Un sélecteur de langue doit trouver sa place, discret, accessible depuis
n'importe quel écran.

Emploie exactement ces termes en français :
campagne, candidature, document, atypique, score, adéquation, clarté,
qualité formelle, niveau 1, niveau 2, lot d'import.

Ne traduis pas « atypique » et ne le remplace pas par « suspect », « rejeté » ou
« erreur ». Un document atypique n'est pas fautif : le système signale qu'il ne
peut pas se prononcer.

## Contraintes techniques

L'implémentation se fera en Angular avec Tailwind CSS et Angular CDK. Conçois
avec des composants réutilisables et une échelle d'espacement régulière. Évite
tout effet qui demanderait une bibliothèque graphique lourde.

## Accessibilité — exigence, pas option

- Contraste minimum 4,5:1 pour le texte
- L'information n'est JAMAIS portée par la couleur seule : toujours doublée d'une
  icône, d'un libellé ou d'une forme
- Tout élément interactif a un état de focus visible
- Les tableaux ont de vrais en-têtes de colonnes

## Les cinq problèmes de conception à résoudre

Ce sont les vraies difficultés. Traite-les explicitement.

1. **Signaler un document atypique sans dramatiser.** Ce n'est pas une erreur
   système ni une faute du candidat. Ça doit se voir au premier coup d'œil dans
   une liste de 400 lignes, sans transformer l'écran en tableau d'alarmes.

2. **Distinguer « pas de score » de « mauvais score ».** Une candidature dont
   aucun document n'est exploitable n'a PAS de score — elle ne vaut pas zéro.
   Zéro voudrait dire « mauvaise candidature » et la classerait en dernier. Ces
   candidatures doivent sortir du classement et former un groupe à part, traité
   à la main. C'est la distinction la plus importante de toute l'interface.

3. **Présenter deux niveaux d'analyse en séquence.** Sur le détail d'un
   document, le lecteur doit comprendre que le niveau 2 dépend du niveau 1 —
   et, quand le niveau 2 n'a pas eu lieu, comprendre pourquoi sans avoir à le
   déduire.

4. **Afficher trois sous-scores et leurs justifications sans saturer.** Les
   chiffres se comparent d'un coup d'œil, les justifications se lisent. Les
   deux besoins ne demandent pas le même traitement visuel.

5. **Suivre le traitement d'un lot de 200 documents.** Plusieurs minutes,
   document par document, avec des échecs partiels possibles. Claire doit savoir
   ce qui avance, ce qui a échoué et pourquoi, sans rester devant l'écran.

## Direction visuelle

Outil professionnel de travail, consulté plusieurs heures d'affilée. Sobre,
dense mais respirable, sans décoration. La lisibilité prime sur l'originalité.

Une seule couleur d'accent. Les couleurs sémantiques — atypique, non évaluable,
erreur — sont distinctes de l'accent et ne s'utilisent que pour l'état.

À éviter absolument : dégradés, ombres portées prononcées, coins très arrondis,
emoji comme repères de section, esthétique de tableau de bord marketing.

Thème clair UNIQUEMENT. Ne propose pas de variante sombre, même en complément :
elle ne sera pas implémentée, et une maquette qui ne correspond à rien dans
l'application est un écart à justifier plutôt qu'un livrable en plus.

## Les écrans

### Écran 1 — Classement des candidatures (écran principal)

L'écran où Claire passe l'essentiel de son temps.

- En-tête : nom de la campagne, nombre de candidatures, nombre de documents
  atypiques, et l'export — qui propose DEUX formats, CSV et PDF, sans occuper
  deux boutons distincts dans l'en-tête
- Barre de filtres : recherche par nom, filtre « comporte au moins un document
  atypique », plage de score
- Tableau classé par score décroissant. Colonnes : rang, nom du candidat,
  score, nombre de documents, nombre d'atypiques
- Section distincte en fin de liste : les candidatures NON ÉVALUABLES, sans
  score, avec la raison
- États à dessiner : liste pleine, liste vide, analyse en cours

### Écran 2 — Détail d'une candidature

- Identité du candidat, score global, rang
- Comment le score est composé à partir des documents retenus
- Liste des documents de la candidature, chacun avec son type détecté, son
  statut et son score
- Les documents atypiques sont visuellement séparés des documents retenus
- Depuis cette liste, on ouvre le détail d'un document
- Action de SUPPRESSION de la candidature, réservée à l'administrateur. Elle ne
  mérite pas son propre écran : dessine-la comme une boîte de dialogue de
  confirmation ouverte au-dessus de cet écran. Elle doit énoncer exactement ce
  qui sera détruit — la candidature, ses documents, leurs textes et leurs
  analyses — et qu'une trace de l'opération est conservée au journal d'audit.
  Discrète dans la page, explicite dans la confirmation : c'est une action de
  conformité honorant un droit à l'effacement, pas une action courante

### Écran 3 — Détail d'un document (l'écran différenciant)

Le plus important à réussir. Il doit rendre le jugement du système entièrement
lisible et contestable.

- Nom du fichier, taille, date d'analyse, bouton de téléchargement de l'original
- Bloc Niveau 1 : type détecté, confiance en pourcentage, justification écrite
- Bloc Niveau 2 : les trois sous-scores avec leurs justifications, et le score
  pondéré du document
- Cas à dessiner impérativement : un document ATYPIQUE, où le niveau 2 n'a pas
  été exécuté. L'écran doit dire lequel des trois motifs s'applique —
  confiance insuffisante, type inattendu, ou document illisible — et rendre
  évident qu'aucun score n'existe et pourquoi
- Mention discrète du modèle utilisé et de la date, pour la traçabilité

### Écran 4 — Import d'un lot

- L'archive ZIP est le SEUL canal d'import. Pas de sélecteur de source, pas
  d'onglet, pas de second chemin : l'écran s'ouvre directement sur la zone de
  dépôt
- Zone de glisser-déposer, doublée d'un bouton de sélection de fichier
- Sélection de la campagne de destination avant ou pendant le dépôt
- Pendant le traitement : progression globale et progression par document
- Les fichiers rejetés sont LISTÉS avec leur motif — trop volumineux, format non
  accepté, entrée d'archive refusée pour raison de sécurité. Jamais ignorés en
  silence
- ATTENTION, distinction à ne pas confondre : un fichier REJETÉ n'entre jamais
  dans le lot, il est refusé au dépôt. Un document ILLISIBLE, lui, est bien
  importé, puis marqué atypique à l'analyse. Le premier apparaît sur cet écran,
  le second dans le classement et sur le détail du document. Ce ne sont pas les
  mêmes objets et ils ne se ressemblent pas visuellement
- États : avant dépôt, en cours, terminé, terminé avec rejets, et l'archive
  entièrement refusée (plafond global dépassé) — ce dernier cas n'affiche aucune
  liste de fichiers, puisque rien n'a été extrait

### Écran 5 — Configuration d'une campagne

- Nom, description, dates d'ouverture et de clôture
- Sélection multiple des types de documents attendus
- Seuil de confiance : curseur de 0 à 100, valeur par défaut 70, avec une
  explication en une phrase de son effet
- Trois curseurs de pondération : adéquation, clarté, qualité formelle. Leur
  somme n'a pas besoin de valoir 100, ils sont normalisés — mais l'écran doit
  montrer le poids relatif de chacun
- Un aperçu de l'effet des réglages serait un plus

### Écran 6 — Journal d'audit

Écran d'administrateur, consulté rarement mais dans un contexte tendu : un
contrôle, une réclamation, une question du responsable RGPD. Il doit être
exploitable par quelqu'un qui l'ouvre pour la première fois sous pression.

- Tableau en lecture seule, trié par horodatage décroissant. Colonnes :
  horodatage, utilisateur, action, type de ressource, référence de la ressource
- AUCUNE action de modification ou de suppression n'existe sur cet écran, et
  cela doit se voir. Pas de bouton grisé, pas de menu contextuel vide : rien.
  L'inaltérabilité est ce qui donne sa valeur au journal
- Filtres : plage de dates, utilisateur, type d'action
- Une entrée peut concerner une ressource déjà supprimée — c'est le cas normal
  après une suppression ou une purge, pas une anomalie. La référence s'affiche
  alors sans lien cliquable, et l'écran ne doit pas donner l'impression d'une
  donnée manquante ou corrompue
- Affiche quelque part la durée de conservation en vigueur, exprimée en jours
- États à dessiner : journal fourni, et résultat de filtre vide

## Livrable attendu

Pour chaque écran : la maquette, les états listés, et une courte note expliquant
les partis pris sur les cinq problèmes de conception ci-dessus.

Commence par l'écran 1, qui fixe le système visuel. Attends ma validation avant
de passer au suivant.
```

---

## Après réception des maquettes

Trois choses à faire dans la foulée, dans cet ordre :

1. **Confronter les maquettes au modèle de données.** Le dessin des écrans révèle systématiquement des attributs manquants. C'est attendu, et c'est précisément pourquoi le MCD est reconstruit _après_ cette étape.
2. **Extraire la charte graphique** — couleurs, typographies, échelle d'espacement, inventaire de composants — dans `charte-graphique.md`.
3. **Consigner la position accessibilité** dans `accessibilite-rgaa.md`, à partir des choix effectivement retenus.
