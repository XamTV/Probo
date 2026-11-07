# Cahier des charges

Document d'entrée du projet. Il pose le contexte, les objectifs et les contraintes. Le détail fonctionnel vit dans [`user-stories.md`](user-stories.md), les limites dans [`perimetre.md`](perimetre.md).

---

## Contexte

Les écoles post-bac privées et les organismes de formation reçoivent plusieurs centaines de candidatures par campagne de recrutement. Le premier tri est réalisé à la main par une ou deux personnes, sur une période de deux à trois semaines.

Ce tri présente trois faiblesses documentées auprès du persona principal ([`personas.md`](personas.md)) :

1. **Il est coûteux.** Trois semaines-personne par campagne, sur une période où l'équipe est déjà sous tension.
2. **Il est instable.** La qualité du jugement se dégrade nettement après deux heures de lecture continue. Deux dossiers équivalents lus à des moments différents ne reçoivent pas la même attention.
3. **Il n'est pas traçable.** Lorsqu'un candidat conteste un refus, l'établissement n'a aucune trace de ce qui a motivé la décision.

À ces trois faiblesses s'ajoute un problème rarement traité : **les dossiers sont fréquemment mal constitués**. Un portfolio déposé à la place d'un CV, une lettre de recommandation prise pour une lettre de motivation, un PDF scanné illisible. Ces erreurs faussent tout classement qui ne les détecte pas.

## Objectif

Fournir aux responsables d'admission un **classement des candidatures fiable et explicable**, produit à partir d'un lot de documents, dans lequel les fichiers mal constitués sont écartés et signalés avant tout calcul.

L'outil **ordonne et justifie**. Il ne décide pas. La décision d'admission reste humaine, et le produit doit être conçu pour qu'un utilisateur puisse contredire son classement en connaissance de cause.

## Le parti pris

Deux jugements sont séparés là où les outils concurrents n'en font qu'un.

**Niveau 1 — la nature.** _Qu'est-ce que ce document ?_ Classification du type et score de confiance. En cas de doute ou de type inattendu, le document est marqué atypique et **n'entre dans aucun calcul**.

**Niveau 2 — la pertinence.** _Ce document répond-il aux critères de la campagne ?_ Trois sous-scores justifiés, exécutés uniquement sur les documents retenus au niveau 1.

Cette séparation est la garantie que le classement final repose sur des données fiables. C'est la proposition de valeur du produit, et elle contraint toute l'architecture.

## Utilisateurs visés

Écoles post-bac privées (bachelor, MBA, écoles tech, écoles d'art), organismes de formation pour adultes, équipes RH en sourcing alternance. Voir [`personas.md`](personas.md).

---

## Exigences fonctionnelles

Détaillées en 24 user stories déclarées (US-01 à US-24), dont 22 au périmètre v1 — US-08 et US-09 sont hors périmètre avec M-14, abandonné le 31/08/2026 — réparties en six épopées : accès et administration, campagne, import, analyse, consultation, sortie et conformité. Voir [`user-stories.md`](user-stories.md) et [`cas-utilisation.md`](cas-utilisation.md).

Les règles métier sont énoncées dans [`regles-gestion.md`](regles-gestion.md) et implémentées sous test.

## Exigences non fonctionnelles

| Domaine           | Exigence                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Souveraineté**  | Aucune donnée candidat ne quitte l'Union européenne, y compris lors des appels au modèle                                                                                  |
| **Conservation**  | Suppression automatique des candidatures 90 jours après leur création                                                                                                     |
| **Traçabilité**   | Toute opération sur des données personnelles est journalisée, et le journal survit à la purge                                                                             |
| **Explicabilité** | Aucun score n'est affiché sans sa justification textuelle. Le modèle et la version de prompt sont conservés avec chaque analyse                                           |
| **Cloisonnement** | Un établissement n'accède en aucun cas aux données d'un autre. Vérifié par des tests automatisés                                                                          |
| **Volumétrie**    | Une campagne porte 400 à 700 candidatures de trois à cinq fichiers, soit **1 200 à 3 500 documents** ; un lot de cette taille doit être traité sans intervention manuelle |
| **Résilience**    | Le traitement survit à un redémarrage du serveur : les analyses en cours reprennent                                                                                       |
| **Accessibilité** | Contrastes, navigation clavier et libellés de formulaires conformes aux principes du RGAA                                                                                 |
| **Sécurité**      | OWASP Top 10 passé en revue point par point dans le plan de sécurisation                                                                                                  |

## Contraintes

**Souveraineté des données.** Contrainte structurante, pas préférence. Elle exclut les fournisseurs de modèles soumis au Cloud Act et détermine le choix de Mistral AI, société française hébergeant en Europe.

**Ressources.** Un développeur, environ 277 heures de travail estimées, dont 70 consacrées au dossier professionnel et 35 à l'apprentissage. La marge est d'une vingtaine d'heures.

**Échéance.** La soutenance a lieu le **15 avril 2027**, et le dossier professionnel se rend **une semaine avant, le 8 avril**.

C'est la date de rendu qui contraint, pas celle de la soutenance : le dossier doit être fini sept jours plus tôt, et la semaine qui suit ne sert qu'aux répétitions. Tout le calendrier se déduit à rebours du 8 avril — voir le [plan de livraison](plan-livraison.md#la-contrainte-de-calendrier).

Le démarrage date du 15 août 2026, ce qui donne **huit mois**, et non six comme ce document l'a annoncé jusqu'au 02/11/2026. Les 277 heures n'augmentent pas pour autant : c'est une estimation du travail à fournir, pas un quota à remplir. Le calendrier plus long réduit la cadence hebdomadaire exigée — environ 8 heures par semaine au lieu de 10,5 — il n'autorise pas de périmètre supplémentaire. La [règle de gel](perimetre.md#règle-de-gel) s'applique au dernier mois avant le rendu, quelle que soit la durée totale.

**Cadre académique.** Le projet est réalisé pour le titre professionnel Concepteur Développeur d'Applications (TP-01281, niveau 6 RNCP). Il doit couvrir les trois blocs de compétences, ce qui impose des livrables — tests, plan de sécurisation, documentation de déploiement — qui ne sont pas des exigences produit mais sont non négociables.

**Techniques.** Voir le README pour la stack et le [journal des décisions](../journal-decisions.md) pour la justification de chaque choix.

---

## Critères de réussite

Le projet est considéré comme réussi si, à la soutenance :

1. Un lot de 1 200 documents réels au moins est importé, analysé et classé de bout en bout, sans intervention manuelle
2. Le taux de classification correcte du niveau 1 est **mesuré et chiffré** contre le corpus annoté, et non affirmé
3. Les documents atypiques sont visibles dans toutes les vues, exports compris
4. L'application est en ligne sur un domaine réel, déployée par la chaîne d'intégration continue
5. Les 22 user stories du périmètre v1 (« doit être fait »), sur les 24 déclarées, sont livrées et recettées
