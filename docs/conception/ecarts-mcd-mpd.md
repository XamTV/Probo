# Écarts assumés entre le modèle conceptuel et le modèle physique

Le [MCD](mcd.puml) ne porte aucune technique. Le modèle physique, lui, en porte beaucoup. Ce document recense ce que le schéma Prisma ajoute, et pourquoi — de sorte qu'aucun écart ne soit découvert par le jury avant d'être expliqué.

Chaque écart est un choix, pas un oubli.

## 1. `institution_id` dénormalisé jusqu'aux tables profondes

**L'écart.** Au MCD, une candidature appartient à une campagne, qui appartient à un établissement. Un document appartient à une candidature. L'établissement se déduit donc par jointure. Au MPD, `application` et `document` portent chacune une colonne `institution_id` redondante.

**Pourquoi.** C'est le cloisonnement multi-locataire (M-11, US-03). Tout filtre de cloisonnement tient alors en une clause sur la table consultée, sans jointure remontante. Deux bénéfices : la requête reste lisible et donc auditable, et un oubli de filtre devient visible à la relecture plutôt que masqué dans une jointure.

**Le risque accepté.** Une redondance est une incohérence possible. Elle est contenue par la cascade de suppression et par le fait qu'aucun code ne réaffecte une campagne à un autre établissement.

## 2. Horodatages de création et de mise à jour

**L'écart.** `created_at` et `updated_at` sur presque toutes les tables, absents du MCD.

**Pourquoi.** Exploitation et support : savoir quand une ligne est apparue est la première question posée lors d'un incident. Ces colonnes ne portent aucune information métier et n'ont donc rien à faire au niveau conceptuel.

## 3. Empreinte de contenu `sha256`

**L'écart.** Chaque document porte l'empreinte SHA-256 de son contenu.

**Pourquoi.** Détecter le même fichier déposé deux fois dans un lot. L'empreinte est stockée dès maintenant bien que son exploitation en interface soit classée `S-04` — remplir la colonne après coup supposerait de relire tous les fichiers.

## 4. Clés de stockage

**L'écart.** `document.storage_key` et `reference_profile.storage_key` localisent le fichier sur le volume.

**Pourquoi.** Pure mécanique de stockage. Conceptuellement, un document **est** son contenu ; l'endroit où l'octet est posé est une question d'implémentation, et changera si le stockage migre vers un objet distant (`S-03`).

## 5. Texte extrait du référentiel

**L'écart.** `reference_profile.extracted_text` duplique le contenu du document de référence déposé.

**Pourquoi.** Éviter de relancer l'extraction à chaque analyse. C'est un cache, et un cache n'est pas une information conceptuelle.

## 6. Métriques d'exécution de l'analyse

**L'écart.** `level1_model`, `level2_model`, `level1_tokens`, `level2_tokens`, `duration_ms` sur l'analyse.

**Pourquoi.** Coût et performance. Ils ne participent à aucune règle de gestion.

**La frontière à tenir.** `version_prompt` figure au MCD, elles non. La distinction n'est pas arbitraire : la version de prompt est nécessaire pour **expliquer** un score à un candidat qui conteste, ce que le RGPD impose. Le nombre de jetons consommés n'explique rien à personne.

## 7. Index

**L'écart.** Huit index, dont `(campaign_id, overall_score DESC)`, `(institution_id, occurred_at DESC)`, `purge_due_at` et `sha256`.

**Pourquoi.** Performance de lecture. Un index ne change jamais ce que les données signifient.

**Celui qui mérite un mot.** `purge_due_at` est indexé pour que le balayage quotidien de la purge RGPD (M-12, US-20) reste un parcours d'index et non un parcours complet de table — c'est une obligation de conservation qui devient une contrainte de performance.

## 8. Détail d'audit en JSON

**L'écart.** `audit_entry.details` est une colonne JSON libre, ainsi que `ip_address` et `user_agent`.

**Pourquoi.** Le contenu pertinent diffère d'une action à l'autre : un seuil passé de 65 à 70 n'a rien à voir avec un chemin d'archive refusé. Modéliser chaque forme produirait une dizaine de tables presque vides.

**La réserve.** Une colonne JSON est une renonciation à la contrainte. Le prix est accepté ici parce que le journal n'est jamais interrogé par son contenu, seulement listé et filtré sur ses colonnes typées.

## 9. Le rang n'existe nulle part

**L'écart.** Ni au MCD, ni au MPD — alors que le classement est le livrable principal du produit.

**Pourquoi.** Un rang matérialisé s'invaliderait à chaque document analysé, pour toutes les candidatures de la campagne. Il se calcule à la lecture, par fonction fenêtre sur `overall_score`.

C'est le seul « écart » qui soit une absence volontaire plutôt qu'un ajout.

## 10. Une contrainte de RG-08 non portée par le schéma

**L'écart.** RG-08 exige qu'un référentiel porte **exactement une** des deux formes — profil décrit **ou** document déposé, jamais les deux, jamais aucune. Le schéma rend les quatre colonnes nullables et ne contraint rien.

**Pourquoi.** Prisma ne génère pas de contrainte `CHECK`. La règle est donc tenue par le code, dans `packages/shared`, et testée là.

**À faire.** Ajouter la contrainte `CHECK` en SQL dans une migration manuelle. Tant qu'elle n'y est pas, cet écart est une **faiblesse**, pas un choix — c'est le seul de cette liste dans ce cas, et il est signalé comme tel.
