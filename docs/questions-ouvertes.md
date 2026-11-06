# Questions ouvertes

Les arbitrages identifiés mais pas encore rendus. Ce registre existe parce que le [journal de décisions](journal-decisions.md) est **chronologique** : il enregistre ce qui a été décidé, pas ce qui attend de l'être. Une question posée au détour d'une entrée de septembre n'y est plus visible en novembre.

**Un `Q-xx` est un identifiant stable**, au même titre que `US-xx`, `RG-xx` ou `M-xx` : jamais renuméroté, jamais réattribué. Une question tranchée reste ici, à l'état `Tranchée`, avec le renvoi vers l'entrée de journal qui porte la décision — c'est ce qui permet de relire une question sans rouvrir le débat.

**Le vérificateur de cohérence l'impose.** Toute mention de « à trancher » ou « Reste ouvert » dans le journal doit citer un `Q-xx` enregistré ici, sans quoi `npm run coherence` échoue, et la CI avec lui. C'est le mécanisme qui remplace l'attention.

## Registre

| Clé  | Question                                                         | Posée le   | Échéance            | État     |
| ---- | ---------------------------------------------------------------- | ---------- | ------------------- | -------- |
| Q-01 | L'extraction d'identité : appel dédié ou greffée sur le niveau 1 | 03/09/2026 | Lot 4               | Ouverte  |
| Q-02 | Le jeton d'invitation : une table ou deux colonnes               | 05/10/2026 | Lot 2               | Tranchée |
| Q-03 | Créer le premier administrateur d'un établissement en production | 03/11/2026 | Avant mise en ligne | Ouverte  |

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
