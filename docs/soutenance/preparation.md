# Préparation de la soutenance

Ce que l'oral montrera, et comment le dossier le défend. Arrêté le 11/11/2026 au terme d'une séance de questions sur le projet ; les deux décisions structurantes — la place de l'assistant et la position sur le règlement européen sur l'IA — sont au [journal](../journal-decisions.md) à cette date.

Ce fichier existe parce que ces décisions n'avaient d'abord vécu que dans une conversation. C'est le mode d'échec que [`CLAUDE.md`](../../CLAUDE.md) décrit pour le jeton d'invitation : une décision hors du dépôt n'est tenue par rien.

## L'assistant de code est assumé

**Le constat.** 58 des 59 premiers commits portent `Co-Authored-By: Claude`. Un `git log` suffit à le voir, et le jury le verra.

**La posture.** L'assumer, dans une section du dossier de projet consacrée à la méthode de travail. Le centre n'a pas de règle écrite sur l'usage de l'IA (vérifié le 11/11/2026).

**L'argument.** Le dépôt montre une méthode de **contrôle**, pas une délégation :

- le hook [`refus-publication`](../../.claude/hooks/) retire à l'assistant le droit de commiter, de pousser et de fusionner ; chaque commit passe par la relecture de l'auteur ;
- [`coherence.test.ts`](../../tests/coherence.test.ts) tient le dossier et le code ensemble sans dépendre de personne ;
- le journal garde les fois où l'assistant a enfreint une règle écrite, et le mécanisme qui a remplacé la règle — les entrées des 08/10 et 02/11/2026 sur le commit.

**La contrepartie.** L'auteur explique et réécrit seul, au tableau, les quatre parties que le jury creusera :

| Partie                                                                        | Lot | Séance sans assistant |
| ----------------------------------------------------------------------------- | --- | --------------------- |
| Le cloisonnement par `institutionId`, et le piège de `@UsePipes`              | 1   | À rattraper           |
| L'authentification : Argon2, JWT en cookie `httpOnly`, verrouillage du compte | 1   | À rattraper           |
| La décompression défensive de RG-07                                           | 3   | À faire avant fusion  |
| La chaîne niveau 1 → réconciliation → niveau 2                                | 4-5 | À venir               |

**La méthode, à chaque lot** : l'auteur rédige **lui-même** la description de la pull request, et fait une séance d'explication à voix haute, sans assistant, avant la fusion.

## La démonstration

Trois volets, sur la **production** — c'est la preuve du bloc déploiement :

1. **Une campagne déjà analysée**, pour montrer sans attente le classement, le détail d'une candidature et un document atypique.
2. **Un import de cinq fichiers en direct**, pour prouver que la chaîne tourne vraiment.
3. **Une vidéo de secours**, si le réseau de la salle tombe ou que l'API Mistral traîne.

**Uniquement des documents synthétiques.** Le consentement des documents réels du jeu d'essai ne couvre pas l'affichage — voir l'entrée du 11/11/2026 sur le jeu d'essai.

## Le fil de la présentation

Trois histoires, une par angle. Le reste est une réserve pour les questions.

1. **« Les noms de fichiers mentent »** — l'idée produit, et comment le maquettage a fait naître RG-09 et supprimé l'entité `Criterion`. Angle conception.
2. **L'abandon de l'import Drive** — une lecture de documentation anglophone qui change le périmètre, pas une ligne de code. Angle veille et anglais.
3. **« Une règle sans mécanisme est un vœu »** — le vérificateur de cohérence et le hook, chacun éprouvé en le faisant échouer exprès. Angle qualité ; il répond d'avance à la question de l'assistant.

## Les questions attendues

**« Pourquoi un modèle de langage, et pas un classifieur classique ? »**

- Il n'existe aucun corpus annoté pour entraîner un classifieur supervisé, et le constituer coûterait plus que le produit.
- Le niveau 2 doit **justifier** chaque score par un texte, ce qu'un classifieur ne produit pas.
- Le niveau 1 tourne sur le petit modèle : le coût par document est mesuré par le script d'évaluation du lot 4.
- Limite assumée : le modèle n'est pas déterministe. `promptVersion` et la séparation des deux niveaux l'encadrent.

**« Comment savez-vous que ça marche ? »** Par le jeu d'essai et son script d'évaluation rejouable, avec des critères écrits **avant** la mesure et des résultats donnés avec leur effectif — voir `Q-01` et `Q-06` au [registre](../questions-ouvertes.md).

## Le règlement européen sur l'IA et le RGPD

À développer dans `securite/rgpd.md`. Ce qui suit est l'état des vérifications au 11/11/2026, avec ses limites.

**Probo relève très probablement du haut risque.** L'annexe III, point 3 a), vise les systèmes d'IA « intended to be used to determine access or admission » dans l'enseignement et la formation. Un classement de candidatures destiné aux commissions d'admission en est le cas d'école.

**« L'humain décide » ne suffit pas à en sortir.** L'article 6(3) écarte le haut risque pour un système qui n'exécute qu'une tâche procédurale étroite ou préparatoire, **sauf** s'il réalise un profilage de personnes physiques — il reste alors toujours à haut risque. Noter un CV et une lettre au regard d'un profil recherché ressemble fort à un profilage au sens de l'article 4(4) du RGPD. Ce point est une question d'interprétation, et le dossier le présente comme tel.

**Ce que la thèse « l'humain décide » sert vraiment** : l'article 22 du RGPD, qui encadre les décisions fondées exclusivement sur un traitement automatisé, et le contrôle humain qu'exige le règlement sur l'IA. Le produit la tient par construction, et pas seulement par déclaration :

- `ApplicationStatus` ne connaît aucune valeur d'admission ou de refus — Probo ordonne, il ne décide pas ;
- chaque score porte sa justification ;
- un document atypique est signalé, jamais écarté en silence ;
- M-18 et RG-10 permettent de contredire un verdict, et la contradiction est inscrite au journal d'audit.

**Ce qu'un projet de titre ne couvre pas**, et que le dossier dit : le système de gestion des risques, la documentation technique de conformité et le marquage qu'impose le haut risque.

**Date d'application — à vérifier sur EUR-Lex.** La version consolidée lue sur un site miroir, `artificialintelligenceact.eu`, fixe au **2 décembre 2027** l'application des obligations du haut risque de l'annexe III, après modification du texte d'origine, qui disait 2 août 2026. Les articles 6 et 113 et l'annexe III n'ont pas été relus sur EUR-Lex.

## Mistral et les données des candidats

Vérifié le 11/11/2026 sur [les conditions commerciales](https://legal.mistral.ai/terms/commercial-terms-of-service), [l'avenant de traitement des données](https://legal.mistral.ai/terms/data-processing-addendum), la collection « Data Governance » du [centre d'aide](https://help.mistral.ai/en/collections/789667-data-governance) et [la liste des sous-traitants](https://trust.mistral.ai/subprocessors) de Mistral.

- **Hébergement : l'EEE, pas seulement l'UE.** Les données de l'API sont hébergées par défaut dans l'Union. L'inférence tourne chez Mistral Compute (France), Microsoft (Suède, Norvège), Google (Pays-Bas, Belgique) et CoreWeave (EEE). Google ne sert les États-Unis que pour le point d'accès américain, que Probo n'utilise pas. La Norvège est dans l'EEE, pas dans l'UE : c'est le même régime RGPD, mais pas la phrase que le README écrivait.
- **Cloud Act : réduit, pas écarté.** Microsoft, Google et CoreWeave sont des sociétés américaines. La contrainte de souveraineté a été reformulée en ce sens (`Q-09`, au [registre](../questions-ouvertes.md)) : c'est la réponse à donner au jury, et elle se lit sur la page des sous-traitants de Mistral.
- **Entraînement : le refuser explicitement.** Les conditions générales excluent l'entraînement sur les données du client, sauf exceptions ; l'avenant, qui prévaut, l'autorise tant que le client ne l'a pas refusé. Un compte payant le refuse dans les réglages de confidentialité de la console ; la valeur par défaut n'est pas publiée.
- **Rétention : demander la rétention nulle.** Aucune durée n'est publiée hors de ce régime. La rétention nulle couvre les appels sans état — dont la complétion de texte, seul appel que Probo fait à Mistral —, se demande au support avec un motif, est réservée aux comptes payants et accordée à la discrétion de Mistral.
- **Conséquence pour le jeu d'essai** : entraînement refusé et rétention nulle demandée **avant** l'envoi du premier document réel.
