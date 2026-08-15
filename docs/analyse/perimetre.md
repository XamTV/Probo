# Périmètre

Ce document dit ce qui est dans le projet, ce qui n'y est pas, et ce qui n'y sera que si le temps le permet. Il est la référence en cas d'arbitrage : une demande hors de ce périmètre est refusée ou reportée, elle n'est pas absorbée en silence.

**Contrainte structurante** : environ 277 heures planifiées sur 250 à 300 heures utiles, réparties sur six mois à temps partiel. La marge est d'une vingtaine d'heures. Elle est déjà affectée aux imprévus, pas à de nouvelles fonctionnalités.

---

## Doit être fait — sans quoi le produit n'existe pas

| Réf  | Fonctionnalité                                                                              | Justification                                                              |
| ---- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| M-01 | Authentification par email et mot de passe, avec rôles administrateur et chargé d'admission | Compétence évaluée au référentiel, et prérequis du cloisonnement           |
| M-02 | Création et configuration d'une campagne : types attendus, seuil de confiance, pondération  | Sans campagne, l'analyse de niveau 2 n'a pas de référentiel de comparaison |
| M-03 | Import d'un lot par archive ZIP                                                             | Chemin universel, indépendant de tout service tiers                        |
| M-04 | Extraction du texte des documents PDF                                                       | Cœur technique : sans texte, aucune analyse                                |
| M-05 | Analyse de niveau 1 — classification du type et score de confiance                          | Le différenciateur produit                                                 |
| M-06 | Signalement des documents atypiques dans toutes les vues                                    | Ce qui distingue Probo d'un scoreur générique                              |
| M-07 | Analyse de niveau 2 — trois sous-scores et justifications, sur documents retenus uniquement | La proposition de valeur principale                                        |
| M-08 | Regroupement par candidat et score agrégé                                                   | Le livrable que l'utilisateur consulte                                     |
| M-09 | Tableau de bord : classement, filtres, recherche                                            | L'écran principal du produit                                               |
| M-10 | Drill-down document : détail des deux niveaux d'analyse                                     | Ce qui rend le score explicable                                            |
| M-11 | Cloisonnement multi-établissement                                                           | Sécurité, et prérequis de toute mise en production                         |
| M-12 | Purge automatique à 90 jours et journal d'audit                                             | Obligation RGPD, et argument commercial                                    |
| M-13 | Export CSV du classement                                                                    | Le format que les équipes d'admission utilisent réellement                 |
| M-14 | Import depuis un dossier Google Drive privé, par compte de service                          | Demande explicite, et facteur d'adoption réel                              |
| M-15 | Export PDF du classement                                                                    | Demande explicite : le document qui circule en commission                  |

## Devrait être fait — sera coupé en premier en cas de retard

| Réf  | Fonctionnalité                                     | Conséquence si coupé                                                                                                   |
| ---- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| S-01 | OCR des PDF scannés (`tesseract`)                  | Un scan sans couche texte est marqué `ILLISIBLE`, ce qui reste un comportement cohérent avec RG-03 plutôt qu'un défaut |
| S-02 | Tests de parcours Playwright                       | Les tests unitaires et d'intégration couvrent déjà le référentiel ; le cahier de recettes prend le relais en manuel    |
| S-03 | Migration du stockage vers Scaleway Object Storage | Le volume disque fonctionne ; la limite est documentée avec sa voie de migration                                       |
| S-04 | Détection des doublons via l'empreinte SHA-256     | L'empreinte est stockée dès le départ ; seule l'exploitation en interface serait reportée                              |

## Pourrait être fait — uniquement si tout le reste est terminé

| Réf  | Fonctionnalité                                                     |
| ---- | ------------------------------------------------------------------ |
| C-01 | Critères de campagne libres, au-delà des trois axes de pondération |
| C-02 | Comparaison côte à côte de deux candidatures                       |
| C-03 | Notifications par email en fin de traitement d'un lot              |
| C-04 | Réexécution d'une analyse après changement de prompt               |

## Ne sera pas fait — décisions actées

| Fonctionnalité                                     | Raison du refus                                                                                                                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connexion OAuth au compte Google de l'utilisateur  | Le scope `drive.readonly` est classé _restricted_ par Google : vérification obligatoire avec audit de sécurité tiers annuel. Incompatible avec le calendrier et le budget. Le compte de service couvre le besoin. |
| Import depuis un lien Drive public                 | Rendu inutile par le compte de service, et aucun établissement ne partage publiquement des dossiers de candidature.                                                                                               |
| Sécurité au niveau ligne (RLS PostgreSQL)          | Le cloisonnement applicatif par `etablissement_id` suffit et se teste. Cité comme évolution, pas implémenté.                                                                                                      |
| Facturation, abonnements, paiement                 | Hors sujet pour un projet de titre.                                                                                                                                                                               |
| Application mobile                                 | Le produit est un outil de bureau, consulté sur grand écran.                                                                                                                                                      |
| Analyse de documents non PDF (Word, images seules) | Les Google Docs natifs sont exportés en PDF à l'import ; le reste est marqué atypique.                                                                                                                            |
| Détection de plagiat ou de contenu généré par IA   | Sujet distinct, techniquement incertain, et juridiquement délicat.                                                                                                                                                |

---

## Règle de gel

**Aucune fonctionnalité n'est ajoutée à partir du mois 6.** Ce mois est consacré au durcissement, au jeu d'essai, à la finalisation du dossier et aux répétitions de soutenance.

Une fonctionnalité ajoutée en dernière ligne droite est une fonctionnalité non testée et non documentée — exactement ce sur quoi un jury appuie.
