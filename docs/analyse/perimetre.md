# Périmètre

Ce document dit ce qui est dans le projet, ce qui n'y est pas, et ce qui n'y sera que si le temps le permet. Il est la référence en cas d'arbitrage : une demande hors de ce périmètre est refusée ou reportée, elle n'est pas absorbée en silence.

**Contrainte structurante** : environ 277 heures planifiées sur 250 à 300 heures utiles, réparties sur huit mois à temps partiel — du 15/08/2026 au rendu du 08/04/2027. La marge est d'une vingtaine d'heures. Elle est déjà affectée aux imprévus, pas à de nouvelles fonctionnalités.

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
| M-15 | Export PDF du classement                                                                    | Demande explicite : le document qui circule en commission                  |
| M-16 | Référentiel de comparaison par type de document attendu                                     | Sans lui, le niveau 2 n'a rien à quoi comparer — voir RG-08                |
| M-17 | Réconciliation de l'identité des candidats avant analyse                                    | Un regroupement erroné corrompt deux scores en silence — voir RG-09        |
| M-18 | Contradiction humaine d'un verdict d'analyse                                                | Sans elle, Probo tranche au lieu d'ordonner et justifier — voir RG-10      |

> **M-14 est vacant.** Il portait l'import depuis un dossier Google Drive, sorti du périmètre le 31/08/2026 — voir la table des reports ci-dessous. L'identifiant n'est pas réattribué : `M-15` reste `M-15`, sans quoi les user stories qui le citent désigneraient silencieusement une autre fonctionnalité.

> **M-18 est un ajout du 05/10/2026.** Les personas exigent que Claire puisse contredire l'outil ; rien dans le périmètre ne le permettait. Sa portée est volontairement minimale : confirmer ou requalifier depuis le détail du document, rien de plus. La relance en OCR et la requalification de masse restent hors périmètre.

> **M-16 et M-17 sont des ajouts du 03/09/2026**, et non du cadrage initial. Ils comblent deux trous que le maquettage a révélés : le niveau 2 n'avait aucun référentiel de comparaison documenté, et le regroupement par candidat se fiait au nom de fichier alors que tout le produit repose sur le fait que les noms de fichiers mentent. Ce sont des « doit être fait » : sans eux, le cœur du produit ne tient pas. Voir le journal de décisions.

## Devrait être fait — sera coupé en premier en cas de retard

| Réf  | Fonctionnalité                                     | Conséquence si coupé                                                                                                    |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| S-01 | OCR des PDF scannés (`tesseract`)                  | Un scan sans couche texte est marqué `UNREADABLE`, ce qui reste un comportement cohérent avec RG-03 plutôt qu'un défaut |
| S-02 | Tests de parcours Playwright                       | Les tests unitaires et d'intégration couvrent déjà le référentiel ; le cahier de recettes prend le relais en manuel     |
| S-03 | Migration du stockage vers Scaleway Object Storage | Le volume disque fonctionne ; la limite est documentée avec sa voie de migration                                        |
| S-04 | Détection des doublons via l'empreinte SHA-256     | L'empreinte est stockée dès le départ ; seule l'exploitation en interface serait reportée                               |

## Pourrait être fait — uniquement si tout le reste est terminé

| Réf  | Fonctionnalité                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------- |
| C-01 | Critères de campagne libres et structurés — mots-clés, niveau requis, langue — en complément du référentiel de M-16 |
| C-02 | Comparaison côte à côte de deux candidatures                                                                        |
| C-03 | Notifications par email en fin de traitement d'un lot                                                               |
| C-04 | Réexécution d'une analyse après changement de prompt                                                                |

## Sorti du périmètre en cours de route — reporté après le titre

Cette table n'existait pas au cadrage. Elle porte ce qui était engagé puis retiré, avec la date et le motif : un périmètre qui se réduit sans laisser de trace est un périmètre qu'on ne peut pas défendre.

| Réf  | Fonctionnalité                                               | Sortie le  | Motif                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-14 | Import depuis un dossier Google Drive, par compte de service | 31/08/2026 | Deuxième canal d'ingestion pour un besoin que M-03 couvre déjà — un dossier Drive se télécharge en ZIP en deux clics. Le coût réel n'est pas l'appel d'API mais tout ce qui l'entoure : entité de connexion, écran d'administration, cloisonnement à prouver (l'ancienne RG-07), export des Google Docs natifs, et une clé de compte de service à protéger en production. Voir le journal de décisions. |

**Ce que le report change pour la v2.** Le travail d'analyse reste valable et n'est pas à refaire : US-08, US-09 et CU-11 sont conservées, marquées hors périmètre v1. La recherche sur les scopes Google — `drive.file` contre `drive.readonly`, le mur de vérification, le mécanisme des comptes de service — reste le meilleur gisement de veille anglophone du projet, et elle a désormais servi **deux** décisions plutôt qu'une.

## Ne sera pas fait — décisions actées

| Fonctionnalité                                     | Raison du refus                                                                                                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connexion OAuth au compte Google de l'utilisateur  | Le scope `drive.readonly` est classé _restricted_ par Google : vérification obligatoire avec audit de sécurité tiers annuel, incompatible avec le calendrier et le budget. Refus maintenu, et sans objet depuis le report de M-14. |
| Import depuis un lien Drive public                 | Aucun établissement ne partage publiquement un dossier de candidatures. Sans objet depuis le report de M-14.                                                                                                                       |
| Sécurité au niveau ligne (RLS PostgreSQL)          | Le cloisonnement applicatif par `etablissement_id` suffit et se teste. Cité comme évolution, pas implémenté.                                                                                                                       |
| Facturation, abonnements, paiement                 | Hors sujet pour un projet de titre.                                                                                                                                                                                                |
| Application mobile                                 | Le produit est un outil de bureau, consulté sur grand écran.                                                                                                                                                                       |
| Analyse de documents non PDF (Word, images seules) | Le PDF est le format de dépôt réel des candidatures. Une entrée d'archive d'un autre type est refusée à la décompression (RG-07), sans faire échouer le lot.                                                                       |
| Détection de plagiat ou de contenu généré par IA   | Sujet distinct, techniquement incertain, et juridiquement délicat.                                                                                                                                                                 |

---

## Règle de gel

**Aucune fonctionnalité n'est ajoutée à partir du 8 mars 2027**, soit un mois avant le rendu du dossier le 8 avril. Ce dernier mois est consacré au durcissement, au jeu d'essai et à la finalisation du dossier ; la semaine qui sépare le rendu de la soutenance du 15 avril ne sert qu'aux répétitions.

La règle porte sur une durée — le dernier mois — et non sur un numéro de mois : elle se recalcule depuis **la date de rendu**, jamais depuis la date de démarrage ni depuis celle de la soutenance. Formulée en « mois 6 » jusqu'au 02/11/2026, elle désignait un mois qui n'était pas le dernier.

Une fonctionnalité ajoutée en dernière ligne droite est une fonctionnalité non testée et non documentée — exactement ce sur quoi un jury appuie.
