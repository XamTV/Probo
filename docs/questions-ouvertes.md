# Questions ouvertes

Les arbitrages identifiés mais pas encore rendus. Ce registre existe parce que le [journal de décisions](journal-decisions.md) est **chronologique** : il enregistre ce qui a été décidé, pas ce qui attend de l'être. Une question posée au détour d'une entrée de septembre n'y est plus visible en novembre.

**Un `Q-xx` est un identifiant stable**, au même titre que `US-xx`, `RG-xx` ou `M-xx` : jamais renuméroté, jamais réattribué. Une question tranchée reste ici, à l'état `Tranchée`, avec le renvoi vers l'entrée de journal qui porte la décision — c'est ce qui permet de relire une question sans rouvrir le débat.

**Le vérificateur de cohérence l'impose.** Toute mention de « à trancher » ou « Reste ouvert » dans le journal doit citer un `Q-xx` enregistré ici, sans quoi `npm run coherence` échoue, et la CI avec lui. C'est le mécanisme qui remplace l'attention.

## Registre

| Clé  | Question                                                          | Posée le   | Échéance            | État     |
| ---- | ----------------------------------------------------------------- | ---------- | ------------------- | -------- |
| Q-01 | L'extraction d'identité : appel dédié ou greffée sur le niveau 1  | 03/09/2026 | Lot 4               | Ouverte  |
| Q-02 | Le jeton d'invitation : une table ou deux colonnes                | 05/10/2026 | Lot 2               | Tranchée |
| Q-03 | Créer le premier administrateur d'un établissement en production  | 03/11/2026 | Avant mise en ligne | Ouverte  |
| Q-04 | La valeur du plafond de taille totale décompressée                | 06/11/2026 | Lot 3               | Tranchée |
| Q-05 | Le mécanisme d'avancement : SSE, WebSocket ou scrutation          | 06/11/2026 | Lot 3               | Tranchée |
| Q-06 | Le seuil de confiance sur l'identité lue                          | 06/11/2026 | Lot 4               | Ouverte  |
| Q-07 | `prompt_version` quand RG-03 interdit l'appel au modèle           | 06/11/2026 | Lot 4               | Ouverte  |
| Q-08 | Le nommage des clés de stockage et le cloisonnement sur le volume | 06/11/2026 | Lot 3               | Tranchée |

---

## Q-01 · L'extraction d'identité : appel dédié ou greffée sur le niveau 1

**Posée le** 03/09/2026, dans l'entrée de journal qui fonde RG-09 et US-23.

RG-09 impose de lire l'identité du candidat **dans le texte du document**, le nom de fichier n'étant plus qu'un indice. Reste à savoir comment : un second appel au modèle par document, ou une extraction d'identité greffée sur l'appel de niveau 1 qui vérifie déjà la nature du document.

**Ce qui est en jeu.** Un appel dédié double le coût par document et la latence d'un lot de 1 200 fichiers. Une extraction greffée partage un prompt entre deux tâches de nature différente — classer un type, lire un nom propre — ce qui dégrade typiquement les deux, et rend la confiance renvoyée difficile à interpréter : elle porterait sur quoi ?

**Échéance.** Lot 4, à l'implémentation de la chaîne d'extraction. La décision demande des mesures sur le jeu d'essai, pas un raisonnement a priori.

**Dépend de** `tests/jeu-essai/` — 40 documents réels annotés, encore à constituer.

---

## Q-02 · Le jeton d'invitation : une table ou deux colonnes

**Posée le** 05/10/2026, dans l'entrée qui décide du lien d'invitation à usage unique pour US-02.

**Tranchée le** 02/11/2026 : **deux colonnes sur `user`**, `invitationTokenHash` et `invitationExpiresAt`. Voir l'entrée du 02/11/2026 au journal.

**État d'avancement.** **Implémentée le 06/11/2026**, au lot 2 comme prévu. `user` porte `invitation_token_hash` et `invitation_expires_at`, et `password_hash` est devenue nullable — voir l'entrée du 06/11/2026 au journal. La dette du lot 1 est soldée et US-02 peut être fermée.

---

## Q-03 · Créer le premier administrateur d'un établissement en production

**Posée le** 03/11/2026, dans l'entrée sur la recette.

Probo n'a pas d'inscription libre — c'est voulu, le produit se vend à des établissements. Mais `POST /users` exige une session, qui exige un compte : **le premier administrateur d'un établissement client n'a aucune porte d'entrée**. Le seed ne règle que le poste de développement, et il refuse de s'exécuter en production.

**Les deux voies.** Soit un `M-xx` d'inscription ou d'onboarding, qui est un ajout de périmètre et doit se justifier devant le jury comme tel. Soit une commande d'administration lancée sur le serveur, qui ne coûte rien au périmètre mais déplace le problème vers l'exploitation, et doit alors apparaître au diagramme de déploiement et au plan de sécurisation.

**Échéance.** Avant la mise en ligne, donc au plus tard au lot 7. Trancher plus tôt serait mieux : la réponse change le périmètre, et le périmètre est cité partout.

**Attention.** C'est la seule question ouverte qui bloque un usage réel du produit. Les deux autres bloquent une implémentation.

---

## Q-04 · La valeur du plafond de taille totale décompressée

**Posée le** 06/11/2026, dans l'entrée de cadrage du lot 3.

**Tranchée le** 11/11/2026 : **3 Go d'archive, 4 Go extraits**, sur un poids moyen posé à 1 Mo par document. Voir l'entrée du 11/11/2026 au journal.

RG-07 nomme quatre plafonds : taille par fichier, nombre de fichiers, **taille totale décompressée**, et rapport de décompression. Les trois autres ont une valeur, annoncée à l'utilisateur avant le dépôt par la maquette `ImportDepot` — 20 Mo, 500 fichiers, 500 Mo d'archive — et le rapport vaut × 100 selon `ImportRefuse`. Le troisième n'a de valeur nulle part.

**Ce qui est en jeu.** Il ne fait pas doublon avec le rapport : une archive de 400 Mo déjà peu compressible atteint 20 Go de contenu extrait avec un rapport de × 50, très en dessous du plafond, et sature quand même le disque. Le rapport attrape la bombe ; la taille totale attrape le volume honnête mais ingérable. L'un sans l'autre laisse un trou.

**Pourquoi elle n'est pas tranchée d'office.** Une valeur trop basse refuse des lots légitimes — 1 248 documents est le volume de référence des maquettes —, une valeur trop haute ne protège rien. Le choix dépend du disque réellement provisionné sur le VPS, qui n'est pas arbitré, et doit apparaître au diagramme de déploiement.

**Échéance.** Lot 3, à l'implémentation de RG-07. La règle est codable sans elle — le plafond est lu de l'environnement —, mais elle ne sera pas _testable_ sous son identifiant tant que la valeur par défaut n'existe pas.

**Élargie le 06/11/2026.** La décision du jour sur la volumétrie — le volume du persona fait foi — porte le nombre de fichiers par archive de 500 à 4 000. Le plafond de **taille d'archive**, qui valait 500 Mo sur la base de 500 fichiers, perd sa justification et rejoint cette question : le recalculer demande un **poids moyen de document** qu'aucun livrable n'énonce. Les deux plafonds dépendent de la même inconnue, et la décision les rend **plus** urgents : à rapport × 100 inchangé, une archive plus grosse autorise un volume extrait plus grand.

---

## Q-05 · Le mécanisme d'avancement : SSE, WebSocket ou scrutation

**Posée le** 06/11/2026, par la passe d'audit du lot 3.

**Tranchée le** 11/11/2026 : **Server-Sent Events**, et une estimation de durée calculée dans le navigateur au rythme observé, sans aucune colonne. Voir l'entrée du 11/11/2026 au journal.

Les maquettes `ImportEnCours` et `AnalyseEnCours` affichent une progression document par document, une estimation de durée, et précisent qu'on peut fermer l'écran sans interrompre le traitement. **Aucun livrable ne dit comment le navigateur l'apprend** : ni SSE, ni WebSocket, ni scrutation n'apparaissent nulle part, et le diagramme de déploiement ne porte qu'un `HTTP /api` entre le front et l'API. BullMQ est tranché depuis le 15/08/2026, mais c'est la file **serveur** — elle ne dit rien du chemin vers l'écran.

**Ce qui est en jeu.** Le choix engage le déploiement — proxy, délais d'inactivité, maintien de connexion —, la forme des routes et la structure du front. Il resservira tel quel pour US-18, dont le critère « l'utilisateur est prévenu quand le fichier est prêt » n'a aujourd'hui aucun canal : le courriel est exclu du produit et relégué à C-03.

**Une seconde inconnue dans la même question.** L'estimation « environ 6 minutes restantes » n'a **aucune définition**. Les seules données qui permettraient de la calculer — `duration_ms`, `level1_tokens`, `level2_tokens` — sont justifiées à l'écart n°6 par le fait qu'elles « ne participent à aucune règle de gestion ». Soit l'écart se nuance, soit l'estimation se retire de la maquette.

**Échéance.** Lot 3, avant d'écrire l'écran de suivi.

---

## Q-06 · Le seuil de confiance sur l'identité lue

**Posée le** 06/11/2026, par la passe d'audit.

La maquette `Reconciliation` affiche « confiance 42 % — **sous le seuil** » sur une identité lue. RG-09 parle de « confiance insuffisante » sur l'identité **sans donner de valeur**. Le seul seuil du modèle est `campaign.confidence_threshold`, par défaut 70, que RG-01 réserve explicitement à la **confiance de classification du type de document**.

**Ce qui est en jeu.** Deux décisions de nature différente — scorer ou non un document, soumettre ou non un regroupement à l'arbitrage — seraient pilotées par un réglage unique sans que ce soit écrit. Un établissement qui durcit son seuil de classification verrait mécaniquement changer son nombre d'arbitrages de réconciliation, sans rapport avec ce qu'il voulait régler.

**Ce qui n'est pas en jeu.** L'existence d'un seuil : RG-09 l'impose déjà. Seules sa valeur et son indépendance vis-à-vis de RG-01 sont ouvertes.

**Échéance.** Lot 4, à l'implémentation d'US-23. La valeur demande des mesures, pas un raisonnement a priori.

**Dépend de** `tests/jeu-essai/` — encore à constituer, comme Q-01.

---

## Q-07 · `prompt_version` quand RG-03 interdit l'appel au modèle

**Posée le** 06/11/2026, par la passe d'audit.

`document_analysis.prompt_version` est **obligatoire**, sans valeur par défaut. Or RG-03 veut qu'un document illisible soit marqué atypique « sans aucun appel au modèle » — et son verdict vit pourtant dans cette table. Aucun livrable, aucune constante partagée ne dit ce que vaut la colonne dans ce cas, et `Level1Result` ne porte pas de version de prompt.

**Ce qui est en jeu.** L'écriture du premier verdict du lot 4 est bloquée tant que la question n'est pas tranchée, et les sorties possibles ne s'équivalent pas : une valeur conventionnelle ment sur ce qui s'est passé, une colonne nullable affaiblit la traçabilité que l'écart n°5 justifie précisément par l'explicabilité d'un score, et sortir le verdict de `document_analysis` touche au modèle.

**Échéance.** Lot 4, avant la première écriture d'un verdict.

---

## Q-08 · Le nommage des clés de stockage et le cloisonnement sur le volume

**Posée le** 06/11/2026, par la passe d'audit.

**Tranchée le** 11/11/2026 : **`{institutionId}/{campaignId}/{batchId}/{uuid}.{ext}`**, construite par le serveur, avec une garde de préfixe sur l'établissement de la session. Voir l'entrée du 11/11/2026 au journal.

`document.storage_key` est obligatoire et `reference_profile.storage_key` existe, mais **aucun livrable ne dit comment une clé est construite** : ni schéma de nommage, ni arborescence, ni règle de cloisonnement entre établissements sur le volume. L'écart n°4 décrit à quoi la colonne sert, jamais comment elle est formée ; le plan de sécurisation ne traite que le chiffrement au repos.

**Ce qui est en jeu.** C'est une question de sécurité, pas de convention. Deux établissements dont les fichiers cohabitent dans la même arborescence ne sont séparés que par le filtrage applicatif sur `institution_id` — alors que le cloisonnement est l'argument commercial du produit et le sujet entier du lot 1. Une traversée de chemin, une requête fautive ou une sauvegarde mal découpée exposent les candidatures d'un client à un autre.

**Ce qui la rend urgente.** Le lot 3 écrit les **premiers fichiers sur disque**. La convention sera inventée à l'écriture si elle n'est pas tranchée avant, et elle coûte cher à changer ensuite : les clés sont stockées en base et les fichiers déjà posés.

**Échéance.** Lot 3, avant la première écriture sur le volume.
