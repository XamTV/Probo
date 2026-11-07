# Dictionnaire des données

Dérivé de [`schema.prisma`](../../apps/api/prisma/schema.prisma), qui fait foi. Les noms physiques sont ceux des colonnes PostgreSQL ; le code et la base sont en anglais, ce document en français.

**Règle de tenue.** Ce fichier se met à jour dans la même séance que la migration qui le périme.

## Conventions

Toutes les clés primaires sont des UUID générés par l'application. Les colonnes `created_at` et `updated_at` sont présentes sur la plupart des tables sans valeur métier — voir [`ecarts-mcd-mpd.md`](ecarts-mcd-mpd.md). Elles ne sont pas répétées ci-dessous.

## institution — Établissement client

| Colonne     | Type        | Oblig. | Description                                                                |
| ----------- | ----------- | ------ | -------------------------------------------------------------------------- |
| `id`        | UUID        | oui    | Identifiant                                                                |
| `name`      | texte       | oui    | Raison sociale de l'établissement                                          |
| `siret`     | varchar(14) | non    | Numéro SIRET, facultatif car un établissement étranger n'en a pas          |
| `is_active` | booléen     | oui    | Un établissement désactivé ne peut plus se connecter ; ses données restent |

## user — Compte d'accès

| Colonne                 | Type        | Oblig. | Description                                                                         |
| ----------------------- | ----------- | ------ | ----------------------------------------------------------------------------------- |
| `id`                    | UUID        | oui    | Identifiant                                                                         |
| `institution_id`        | UUID        | oui    | Établissement d'appartenance — porte le cloisonnement                               |
| `email`                 | texte       | oui    | Adresse de connexion, unique sur toute la base                                      |
| `password_hash`         | texte       | non    | Empreinte Argon2 ; vide tant que le propriétaire n'a pas posé son mot de passe      |
| `name`                  | texte       | oui    | Nom affiché dans l'interface et dans le journal d'audit                             |
| `role`                  | `user_role` | oui    | `ADMIN` ou `ADMISSIONS_OFFICER`                                                     |
| `is_active`             | booléen     | oui    | Un compte désactivé ne peut plus se connecter, mais reste attribué à ses lots       |
| `last_login_at`         | horodatage  | non    | Vide tant que le compte ne s'est jamais connecté                                    |
| `failed_login_attempts` | entier      | oui    | Échecs consécutifs ; remis à zéro à chaque connexion réussie (US-01)                |
| `locked_until`          | horodatage  | non    | Échéance du verrouillage, posée au sixième échec. Vide hors verrouillage            |
| `invitation_token_hash` | texte       | non    | Empreinte SHA-256 du lien d'invitation en cours. Vide quand il n'y en a pas (US-02) |
| `invitation_expires_at` | horodatage  | non    | Échéance du lien, sept jours après son émission                                     |

> **`password_hash` vide est une information, pas un trou.** C'est l'état « invité » : le compte existe, son propriétaire n'a pas encore choisi son mot de passe, et il ne peut pas se connecter. L'alternative — poser une empreinte inutilisable — aurait caché cet état au lieu de le dire.
>
> **Le jeton d'invitation est haché, et il est porté par le compte.** Haché parce qu'un vol de base ne doit pas donner la main sur un compte en attente ; SHA-256 et non Argon2 parce qu'un jeton de 256 bits tirés au hasard n'a rien à deviner, contrairement à un mot de passe. Porté par le compte plutôt que par une table parce qu'un seul jeton est vivant à la fois — voir le journal du 02/11/2026.

> **La temporisation se compte par compte, pas par adresse IP.** Un attaquant répartit ses tentatives sur de nombreuses adresses, donc un compteur par IP ne protège de rien ; et verrouiller par IP bloquerait tout un établissement derrière une passerelle unique.

## campaign — Session de recrutement

| Colonne                 | Type                       | Oblig. | Description                                                                                          |
| ----------------------- | -------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `id`                    | UUID                       | oui    | Identifiant                                                                                          |
| `institution_id`        | UUID                       | oui    | Établissement propriétaire                                                                           |
| `name`                  | texte                      | oui    | Intitulé de la campagne                                                                              |
| `description`           | texte                      | non    | Contexte libre, affiché aux utilisateurs                                                             |
| `status`                | `campaign_status`          | oui    | `DRAFT`, `ACTIVE`, `CLOSED` ou `ARCHIVED` ; un brouillon n'accepte aucun import                      |
| `expected_types`        | tableau de `document_type` | oui    | Types réclamés aux candidats ; un type détecté hors de cette liste rend le document atypique (RG-02) |
| `confidence_threshold`  | entier                     | oui    | Seuil de 0 à 100, par défaut 70. En dessous, le document est atypique (RG-01)                        |
| `relevance_weight`      | réel                       | oui    | Poids de l'adéquation dans le score du document (RG-05)                                              |
| `clarity_weight`        | réel                       | oui    | Poids de la clarté                                                                                   |
| `formal_quality_weight` | réel                       | oui    | Poids de la qualité formelle. Les trois poids sont normalisés par leur somme                         |
| `opens_at`              | horodatage                 | non    | Date d'ouverture annoncée aux candidats                                                              |
| `closes_at`             | horodatage                 | non    | Date de clôture                                                                                      |

## reference_profile — Référentiel de comparaison (RG-08)

Ce à quoi le niveau 2 compare chaque document. Un par type attendu : contrainte d'unicité sur `(campaign_id, document_type)`.

| Colonne          | Type            | Oblig. | Description                                                     |
| ---------------- | --------------- | ------ | --------------------------------------------------------------- |
| `id`             | UUID            | oui    | Identifiant                                                     |
| `campaign_id`    | UUID            | oui    | Campagne concernée                                              |
| `document_type`  | `document_type` | oui    | Type de document auquel ce référentiel s'applique               |
| `text`           | texte           | non    | Profil recherché, rédigé par l'établissement                    |
| `file_name`      | texte           | non    | Nom du document de référence déposé, si cette forme est choisie |
| `storage_key`    | texte           | non    | Emplacement du fichier sur le volume                            |
| `extracted_text` | texte           | non    | Texte du document déposé, extrait une fois pour toutes          |

> **Contrainte non portée par le schéma.** RG-08 exige exactement une des deux formes — `text`, ou le trio de colonnes de fichier. Prisma ne génère pas de contrainte `CHECK` : la règle est tenue par le code. Écart signalé comme faiblesse dans `ecarts-mcd-mpd.md`.

## import_batch — Dépôt d'une archive

| Colonne               | Type                  | Oblig. | Description                                                               |
| --------------------- | --------------------- | ------ | ------------------------------------------------------------------------- |
| `id`                  | UUID                  | oui    | Identifiant                                                               |
| `campaign_id`         | UUID                  | oui    | Campagne de destination                                                   |
| `user_id`             | UUID                  | non    | Auteur du dépôt ; vidé si le compte est supprimé, le lot reste            |
| `archive_name`        | texte                 | oui    | Nom de l'archive déposée, conservé pour la piste d'audit                  |
| `status`              | `import_batch_status` | oui    | `PENDING`, `RUNNING`, `AWAITING_RECONCILIATION`, `COMPLETED` ou `FAILED`  |
| `file_count`          | entier                | oui    | Documents effectivement extraits                                          |
| `rejected_file_count` | entier                | oui    | Entrées refusées à la décompression — chemin, type ou plafond (RG-07)     |
| `error_message`       | texte                 | non    | Motif d'un échec global, par exemple un rapport de décompression excessif |
| `completed_at`        | horodatage            | non    | Vide tant que le lot n'est pas terminé                                    |

## application — Candidature d'une personne

| Colonne                   | Type                 | Oblig. | Description                                                                                             |
| ------------------------- | -------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `id`                      | UUID                 | oui    | Identifiant                                                                                             |
| `campaign_id`             | UUID                 | oui    | Campagne de rattachement                                                                                |
| `institution_id`          | UUID                 | oui    | Établissement — dénormalisé pour le cloisonnement                                                       |
| `candidate_name`          | texte                | oui    | Nom du candidat, établi selon `identity_source`                                                         |
| `candidate_email`         | texte                | non    | Adresse du candidat, lue dans ses documents quand elle y figure                                         |
| `external_ref`            | texte                | non    | Référence de dossier propre à l'établissement                                                           |
| `status`                  | `application_status` | oui    | `PENDING`, `RUNNING`, `ANALYSED` ou `FAILED`                                                            |
| `identity_source`         | `identity_source`    | oui    | `FOLDER`, `FILENAME`, `CONTENT` ou `MANUAL` — d'où vient le regroupement (RG-09)                        |
| `overall_score`           | réel                 | non    | Moyenne des documents retenus. **`null` et jamais zéro** quand aucun document n'est exploitable (RG-06) |
| `atypical_document_count` | entier               | oui    | Nombre de documents écartés, affiché à côté du score                                                    |
| `purge_due_at`            | horodatage           | oui    | Échéance de suppression automatique, calculée à la création (M-12)                                      |

## document — Fichier d'une candidature

| Colonne                    | Type                | Oblig. | Description                                                              |
| -------------------------- | ------------------- | ------ | ------------------------------------------------------------------------ |
| `id`                       | UUID                | oui    | Identifiant                                                              |
| `application_id`           | UUID                | oui    | Candidature de rattachement                                              |
| `import_batch_id`          | UUID                | oui    | Lot par lequel le document est arrivé                                    |
| `institution_id`           | UUID                | oui    | Établissement — dénormalisé pour le cloisonnement                        |
| `original_filename`        | texte               | oui    | Nom du fichier dans l'archive, conservé tel quel                         |
| `storage_key`              | texte               | oui    | Emplacement du fichier sur le volume                                     |
| `sha256`                   | char(64)            | oui    | Empreinte du contenu, pour détecter un même fichier déposé deux fois     |
| `size_bytes`               | entier              | oui    | Taille du fichier                                                        |
| `mime_type`                | texte               | oui    | Type réel constaté, non déduit de l'extension                            |
| `detected_candidate_name`  | texte               | non    | Identité **lue dans le texte** du document (RG-09)                       |
| `detected_name_confidence` | entier              | non    | Confiance de 0 à 100 sur cette lecture                                   |
| `extraction_method`        | `extraction_method` | non    | `NATIVE`, `OCR` ou `FAILED` ; vide tant que l'extraction n'a pas eu lieu |
| `status`                   | `document_status`   | oui    | De `PENDING` à `COMPLETED`, en passant par les deux niveaux d'analyse    |
| `error_message`            | texte               | non    | Motif d'un échec de traitement                                           |

## document_text — Texte extrait

Clé primaire partagée avec `document` : un document porte au plus un texte.

| Colonne       | Type   | Oblig. | Description                                                        |
| ------------- | ------ | ------ | ------------------------------------------------------------------ |
| `document_id` | UUID   | oui    | Identifiant, qui est aussi la clé étrangère                        |
| `content`     | texte  | oui    | Texte intégral soumis au modèle                                    |
| `char_count`  | entier | oui    | Longueur, utilisée pour repérer une extraction anormalement pauvre |

## document_analysis — Résultat des deux niveaux

Clé primaire partagée avec `document` : un document porte au plus une analyse.

| Colonne                    | Type              | Oblig. | Description                                                                                 |
| -------------------------- | ----------------- | ------ | ------------------------------------------------------------------------------------------- |
| `document_id`              | UUID              | oui    | Identifiant, qui est aussi la clé étrangère                                                 |
| `detected_type`            | `document_type`   | non    | Type établi au niveau 1 ; vide si le texte était illisible                                  |
| `confidence`               | entier            | non    | Confiance de 0 à 100 sur ce type                                                            |
| `is_atypical`              | booléen           | oui    | Document écarté du calcul des scores                                                        |
| `atypical_reason`          | `atypical_reason` | non    | `LOW_CONFIDENCE`, `UNEXPECTED_TYPE` ou `UNREADABLE`                                         |
| `level1_rationale`         | texte             | non    | Justification écrite de la classification                                                   |
| `relevance_score`          | entier            | non    | Adéquation au référentiel, de 0 à 100                                                       |
| `clarity_score`            | entier            | non    | Clarté                                                                                      |
| `formal_quality_score`     | entier            | non    | Qualité formelle                                                                            |
| `relevance_rationale`      | texte             | non    | Justification de l'adéquation                                                               |
| `clarity_rationale`        | texte             | non    | Justification de la clarté                                                                  |
| `formal_quality_rationale` | texte             | non    | Justification de la qualité formelle                                                        |
| `document_score`           | réel              | non    | Moyenne pondérée des trois sous-scores (RG-05)                                              |
| `overridden_type`          | `document_type`   | non    | Type retenu par une personne à la place de `detected_type` (RG-10)                          |
| `overridden_by_id`         | UUID              | non    | Utilisateur ayant requalifié le document                                                    |
| `overridden_at`            | horodatage        | non    | Date de la requalification                                                                  |
| `override_rationale`       | texte             | non    | Motif de la requalification                                                                 |
| `level1_model`             | texte             | non    | Modèle utilisé pour la classification                                                       |
| `level2_model`             | texte             | non    | Modèle utilisé pour le scoring                                                              |
| `prompt_version`           | texte             | oui    | **Obligatoire.** Sans elle, deux scores différents pour le même document sont inexplicables |
| `level1_tokens`            | entier            | non    | Jetons consommés au niveau 1                                                                |
| `level2_tokens`            | entier            | non    | Jetons consommés au niveau 2                                                                |
| `duration_ms`              | entier            | non    | Durée totale du traitement                                                                  |
| `analysed_at`              | horodatage        | oui    | Date de production du résultat                                                              |

Les six colonnes vides au niveau 2 sont la trace d'un document atypique : RG-04 interdit son exécution.

> **Le verdict du modèle n'est jamais écrasé.** `detected_type`, `confidence` et `is_atypical` conservent ce que le modèle a établi ; les quatre colonnes de requalification (`overridden_type`, `overridden_by_id`, `overridden_at` et `override_rationale`) enregistrent la décision humaine à côté. Un score reste donc explicable jusqu'au bout, y compris quand l'explication est « une personne en a décidé autrement » (RG-10).

## audit_entry — Journal d'audit

Rattaché à l'établissement et non à la candidature : la purge des candidatures laisse la piste intacte.

| Colonne          | Type                | Oblig. | Description                                                                          |
| ---------------- | ------------------- | ------ | ------------------------------------------------------------------------------------ |
| `id`             | UUID                | oui    | Identifiant                                                                          |
| `institution_id` | UUID                | oui    | Établissement concerné                                                               |
| `user_id`        | UUID                | non    | Auteur de l'action ; vide pour les traitements automatiques et les comptes supprimés |
| `action`         | `audit_action`      | oui    | Nature de l'opération                                                                |
| `entity_type`    | `audit_entity_type` | oui    | Type de ressource visée                                                              |
| `entity_id`      | texte               | non    | Référence de la ressource, qui peut déjà avoir été supprimée                         |
| `ip_address`     | texte               | non    | Adresse d'origine de la requête                                                      |
| `user_agent`     | texte               | non    | Client utilisé                                                                       |
| `details`        | JSON                | non    | Contenu variable selon l'action                                                      |
| `occurred_at`    | horodatage          | oui    | Date de survenue                                                                     |

> **`action` et `entity_type` sont des énumérations** depuis le 05/10/2026. Elles étaient des chaînes libres, ce qui rendait le filtrage approximatif et envoyait des valeurs brutes à l'écran — contre la règle i18n du projet, qui veut qu'aucune valeur brute n'atteigne une interface. Le prix est une migration à chaque nouvelle action journalisée ; le jeu est borné et connaissable d'après les cas d'utilisation.
>
> `action` prend 18 valeurs, de `USER_LOGGED_IN` à `RANKING_EXPORTED`. `entity_type` en prend 8 : sept des dix entités du modèle (`INSTITUTION`, `USER`, `CAMPAIGN`, `REFERENCE_PROFILE`, `IMPORT_BATCH`, `APPLICATION`, `DOCUMENT`) plus `SESSION`, qui n'est pas une entité du modèle. Le texte extrait, l'analyse et l'entrée d'audit elle-même n'y figurent pas. `entity_id` est un texte et non un UUID : `SESSION` n'a pas d'identifiant de cette forme, et la référence peut viser une ressource déjà supprimée.
