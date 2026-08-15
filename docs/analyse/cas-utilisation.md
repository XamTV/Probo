# Cas d'utilisation

Vue UML des interactions entre acteurs et système. Chaque cas se rattache aux user stories qu'il réalise ([`user-stories.md`](user-stories.md)).

---

## Acteurs

| Acteur                 | Nature              | Rôle                                                                                                |
| ---------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| **Chargé d'admission** | Principal, humain   | Importe des lots et exploite les classements                                                        |
| **Administrateur**     | Principal, humain   | Configure l'établissement, les campagnes et les accès. Hérite de tous les cas du chargé d'admission |
| **Mistral AI**         | Secondaire, système | Réalise la classification et le scoring                                                             |
| **Google Drive**       | Secondaire, système | Fournit les documents d'un dossier enregistré                                                       |
| **Planificateur**      | Secondaire, système | Déclenche la purge RGPD quotidienne                                                                 |

L'administrateur **généralise** le chargé d'admission : tout ce que le second peut faire, le premier le peut aussi.

---

## Diagramme

```
                          ┌──────────────────────────────────────────────┐
                          │                   PROBO                      │
                          │                                              │
   Chargé                 │   ( CU-01  Se connecter )                    │
 d'admission ─────────────┼──▶                                           │
      │                   │   ( CU-04  Importer un lot )                 │
      │  ────────────────┼──▶        │                                   │
      │                   │          │ «include»                         │
      │                   │          ▼                                   │
      │                   │   ( CU-05  Analyser un document )────────────┼──▶ Mistral AI
      │                   │          │           ▲                       │
      │                   │          │           │ «extend»              │
      │                   │          │    ( CU-06  Signaler un           │
      │                   │          │       document atypique )         │
      │                   │          ▼                                   │
      │                   │   ( CU-07  Calculer le score candidature )   │
      │  ────────────────┼──▶                                            │
      │                   │   ( CU-08  Consulter le classement )         │
      │  ────────────────┼──▶                                            │
      │                   │   ( CU-09  Consulter le détail document )    │
      │  ────────────────┼──▶                                            │
      │                   │   ( CU-10  Exporter le classement )          │
      │                   │                                              │
      △                   │                                              │
      │ généralise        │                                              │
      │                   │                                              │
 Administrateur ──────────┼──▶ ( CU-02  Gérer les comptes )              │
      │                   │                                              │
      │  ────────────────┼──▶ ( CU-03  Configurer une campagne )         │
      │                   │                                              │
      │  ────────────────┼──▶ ( CU-11  Enregistrer un dossier Drive )────┼──▶ Google Drive
      │                   │                                              │
      │  ────────────────┼──▶ ( CU-12  Supprimer une candidature )       │
      │                   │                                              │
      │  ────────────────┼──▶ ( CU-13  Consulter le journal d'audit )    │
                          │                                              │
    Planificateur ────────┼──▶ ( CU-14  Purger les données échues )      │
                          │                                              │
                          └──────────────────────────────────────────────┘
```

> Ce schéma ASCII est une esquisse de travail. La version du dossier sera produite en UML propre (PlantUML ou draw.io) et exportée dans `docs/conception/`.

---

## Fiches

| Réf   | Cas                                 | Acteur               | US                  |
| ----- | ----------------------------------- | -------------------- | ------------------- |
| CU-01 | Se connecter                        | Chargé d'admission   | US-01               |
| CU-02 | Gérer les comptes                   | Administrateur       | US-02               |
| CU-03 | Configurer une campagne             | Administrateur       | US-04, US-05, US-06 |
| CU-04 | Importer un lot                     | Chargé d'admission   | US-07, US-09        |
| CU-05 | Analyser un document                | Système, via Mistral | US-10, US-12        |
| CU-06 | Signaler un document atypique       | Système              | US-11               |
| CU-07 | Calculer le score d'une candidature | Système              | US-13               |
| CU-08 | Consulter le classement             | Chargé d'admission   | US-14, US-15        |
| CU-09 | Consulter le détail d'un document   | Chargé d'admission   | US-16               |
| CU-10 | Exporter le classement              | Chargé d'admission   | US-17, US-18        |
| CU-11 | Enregistrer un dossier Drive        | Administrateur       | US-08               |
| CU-12 | Supprimer une candidature           | Administrateur       | US-19               |
| CU-13 | Consulter le journal d'audit        | Administrateur       | US-21               |
| CU-14 | Purger les données échues           | Planificateur        | US-20               |

---

## CU-04 · Importer un lot — scénario détaillé

Le cas le plus riche, et celui qui porte le plus de règles de gestion.

**Acteur principal** : chargé d'admission
**Préconditions** : utilisateur authentifié, campagne au statut actif
**Postcondition** : un lot d'import existe, ses documents sont enregistrés et mis en file d'analyse

**Scénario nominal**

1. L'utilisateur choisit une campagne et une source — archive ZIP ou connexion Drive enregistrée
2. Le système vérifie que la source appartient à l'établissement de l'utilisateur _(RG-07 pour Drive)_
3. Le système crée un lot d'import au statut « en cours »
4. Le système énumère les fichiers de la source
5. Pour chaque fichier, le système contrôle taille, type MIME et sûreté du chemin
6. Le système regroupe les fichiers par candidat, d'après l'arborescence ou le préfixe du nom
7. Le système enregistre chaque document et met un travail d'analyse en file _(inclut CU-05)_
8. Le système affiche l'avancement, document par document
9. Le lot passe au statut « terminé » lorsque tous ses documents sont traités

**Extensions**

- **2a.** La connexion Drive est inactive ou n'appartient pas à l'établissement → refus, journalisé comme tentative d'accès non autorisée
- **5a.** Un fichier est rejeté → il est **listé à l'écran avec son motif**, le lot se poursuit
- **5b.** Une entrée d'archive contient un chemin remontant → rejet sans écriture sur disque, incident journalisé
- **5c.** La taille décompressée dépasse le plafond → interruption du lot, statut « erreur »
- **6a.** Aucun regroupement déductible → une candidature par fichier, signalée à l'utilisateur
- **7a.** L'extraction de texte échoue → document marqué `ILLISIBLE`, **sans appel au modèle** _(RG-03)_

---

## CU-05 · Analyser un document — scénario détaillé

**Acteur principal** : le système, déclenché par la file de travaux
**Acteur secondaire** : Mistral AI
**Précondition** : un document est enregistré et son texte extrait

**Scénario nominal**

1. Le système soumet le texte au modèle de classification avec un schéma de sortie contraint
2. Le système valide la réponse contre le schéma ; une réponse non conforme est rejetée et réessayée
3. Le système applique les règles d'exclusion _(RG-01, RG-02, RG-03)_
4. Si le document est retenu, le système soumet le texte au modèle de scoring _(RG-04)_
5. Le système calcule le score du document _(RG-05)_
6. Le système enregistre le résultat avec le modèle utilisé, la version de prompt et le coût en jetons
7. Si tous les documents de la candidature sont traités, le système recalcule son score _(RG-07 → CU-07)_

**Extensions**

- **1a.** Quota d'appels atteint → attente exponentielle et nouvelle tentative
- **2a.** Le modèle renvoie une sortie invalide après plusieurs tentatives → document au statut « erreur », traité comme atypique
- **3a.** Le document est atypique → l'étape 4 est sautée, le score reste vide _(RG-04)_
- **7a.** Aucun document retenu dans la candidature → score `null`, jamais zéro _(RG-06)_

---

## Prochaine étape

Ces cas d'utilisation sont la **dernière brique avant le maquettage**. Les maquettes découlent de CU-03, CU-04, CU-08, CU-09 et CU-10 — les cinq écrans du produit.

Le MCD ne sera reconstruit **qu'après** les maquettes, parce que le dessin des écrans révèle systématiquement des attributs manquants. Le refaire avant serait le refaire deux fois.
