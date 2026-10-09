# Modèle Logique de Données

Traduction du [MCD](mcd.puml) en relations. Les règles de passage sont appliquées sans exception ; les choix qui s'en écartent sont justifiés dans [`ecarts-mcd-mpd.md`](ecarts-mcd-mpd.md).

Convention : <u>clé primaire</u>, _#clé étrangère_.

## Relations

**ÉTABLISSEMENT** (<u>id_etablissement</u>, nom, siret, actif)

**UTILISATEUR** (<u>id_utilisateur</u>, adresse_electronique, mot_de_passe, nom, role, actif, derniere_connexion, tentatives_echouees, verrouille_jusqu_a, _#id_etablissement_)

**CAMPAGNE** (<u>id_campagne</u>, nom, description, statut, types_attendus, seuil_de_confiance, poids_adequation, poids_clarte, poids_qualite_formelle, date_ouverture, date_cloture, _#id_etablissement_)

**REFERENTIEL** (<u>id_referentiel</u>, type_de_document, profil_decrit, document_de_reference, _#id_campagne_)
→ contrainte d'unicité sur (_#id_campagne_, type_de_document) : un référentiel et un seul par type attendu (RG-08)

**LOT_IMPORT** (<u>id_lot</u>, nom_archive, statut, nombre_fichiers, nombre_fichiers_refuses, message_erreur, date_achevement, _#id_campagne_, _#id_utilisateur_)

**CANDIDATURE** (<u>id_candidature</u>, nom_candidat, adresse_candidat, reference_externe, statut, origine_identite, score_global, nombre_documents_atypiques, echeance_purge, _#id_campagne_)

**DOCUMENT** (<u>id_document</u>, nom_origine, taille, type_fichier, identite_detectee, confiance_identite, methode_extraction, statut, _#id_candidature_, _#id_lot_)

**TEXTE_EXTRAIT** (<u>_#id_document_</u>, contenu, nombre_caracteres)

**ANALYSE** (<u>_#id_document_</u>, type_detecte, confiance, atypique, motif_atypie, justification_niveau_1, score_adequation, score_clarte, score_qualite_formelle, justification_adequation, justification_clarte, justification_qualite_formelle, score_document, version_prompt, date_analyse, type_requalifie, motif_requalification, date_requalification, _#id_utilisateur_)

**ENTREE_AUDIT** (<u>id_entree</u>, action, type_ressource, reference_ressource, date_survenue, _#id_etablissement_, _#id_utilisateur_)

## Trois points de passage à expliquer

**Les associations binaires un-à-plusieurs ne produisent aucune table.** Elles descendent en clé étrangère du côté de cardinalité maximale 1 — `UTILISATEUR` porte `#id_etablissement`, `DOCUMENT` porte `#id_candidature`. Aucune association du MCD n'est de type plusieurs-à-plusieurs, donc le modèle ne comporte aucune table de jonction.

**Les identifications relatives deviennent des clés primaires partagées.** `TEXTE_EXTRAIT` et `ANALYSE` portent la marque `(R)` au MCD : elles n'ont pas d'identifiant propre et sont identifiées **par** le document auquel elles se rattachent. La règle de passage en tire une clé primaire qui **est** la clé étrangère `#id_document`.

Ce n'est donc pas un raccourci : c'est ce que le MCD prescrit. Et c'est ce qui garantit structurellement qu'un document ne porte qu'un texte et qu'une analyse — là où une clé autonome aurait laissé la porte ouverte aux doublons.

**Les clés étrangères facultatives traduisent des cardinalités minimales à zéro.** `LOT_IMPORT.#id_utilisateur` et `ENTREE_AUDIT.#id_utilisateur` sont nullables : un compte supprimé ne doit pas emporter les lots qu'il a importés ni les traces qu'il a laissées. C'est ce qui permet au journal d'audit de survivre à la suppression d'un compte.

## Ce que le MLD ne dit pas encore

Les index, les horodatages de création et de mise à jour, l'empreinte de contenu et les clés de stockage relèvent du modèle physique.

**La dénormalisation de `#id_etablissement` non plus n'apparaît pas ici.** `CANDIDATURE` et `DOCUMENT` ne sont pas reliées à `ÉTABLISSEMENT` au MCD : elles l'atteignent par `CAMPAGNE`. La clé étrangère que le modèle physique leur ajoute n'est produite par aucune règle de passage — c'est une optimisation du cloisonnement.

Tous ces ajouts sont décrits et justifiés dans [`ecarts-mcd-mpd.md`](ecarts-mcd-mpd.md), visibles au [MPD](mpd.puml) et dans [`schema.prisma`](../../apps/api/prisma/schema.prisma).
