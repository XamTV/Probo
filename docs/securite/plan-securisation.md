# Plan de sécurisation

L'OWASP Top 10 traité point par point : ce que le produit fait, et pourquoi.

## Comment ce document s'écrit

**Il grossit avec le code, pas avant.** Chaque entrée est écrite dans la séance du lot qui la produit — c'est le quatrième point de la [définition de fini](../analyse/plan-livraison.md). Une entrée rédigée avant son code décrirait une intention ; rédigée trois mois après, elle serait reconstituée de mémoire.

Les entrées non encore écrites portent le lot qui les produira. Une entrée vide est donc un rendez-vous, pas un oubli.

| Catégorie OWASP 2021                        | État                                         |
| ------------------------------------------- | -------------------------------------------- |
| A01 — Contrôle d'accès défaillant           | **Écrite** — lot 1                           |
| A02 — Défaillances cryptographiques         | **Écrite** — lot 1                           |
| A03 — Injection                             | Lot 3, à la décompression de l'archive       |
| A04 — Conception non sécurisée              | Lot 4, avec l'analyse et la réconciliation   |
| A05 — Mauvaise configuration                | Lot 7, au déploiement                        |
| A06 — Composants vulnérables                | Lot 7, avec la chaîne d'intégration continue |
| A07 — Défaillances d'identification         | **Écrite** — lot 1                           |
| A08 — Défaut d'intégrité                    | Lot 4, sur les réponses du modèle            |
| A09 — Journalisation insuffisante           | Lot 7, avec M-12                             |
| A10 — Falsification de requête côté serveur | **Sans objet** — voir plus bas               |

---

## A01 — Contrôle d'accès défaillant

C'est le risque principal du produit. Probo héberge les candidatures de plusieurs établissements dans une seule base : une fuite entre locataires n'est pas un incident technique, c'est une violation de données personnelles chez un client.

### L'établissement vient de la session, jamais de la requête

`institutionId` est porté par le jeton de session, signé par le serveur. Un appelant ne peut donc pas demander les données d'un établissement auquel il n'appartient pas — non parce qu'un contrôle le refuse, mais parce qu'**il n'a aucun moyen de le formuler**.

Deux fonctions portent la règle, dans `apps/api/src/common/tenant.ts` :

- `scopedWhere(user, where)` ajoute l'établissement de l'appelant à toute clause de filtrage, et **écrase** un `institutionId` que l'appelant aurait glissé dans sa charge utile.
- `orNotFound(row)` transforme une ligne absente en 404.

Elles sont minuscules exprès : la règle est **nommée à chaque appel** au lieu d'être réécrite en `if` que le prochain gestionnaire oubliera.

### 404 et jamais 403

US-03 l'exige, et la distinction n'est pas cosmétique. Un 403 confirme que la ressource existe : il apprend à l'attaquant que l'identifiant qu'il a deviné est réel, ce qui transforme une énumération d'identifiants en cartographie du système. Un 404 ne dit rien.

Le 404 est ici une **conséquence de la requête**, pas un second contrôle : comme le filtrage par établissement est déjà dans la clause, la ligne d'un autre locataire ne revient simplement pas. Un contrôle séparé pourrait diverger de la requête ; celui-ci ne le peut pas.

**L'exception assumée.** Un rôle manquant renvoie 403, pas 404. L'appelant est identifié et la ressource appartient à son propre établissement : son existence n'est pas un secret, seule la permission l'est.

### L'authentification est globale, pas opt-in

Le garde est enregistré en `APP_GUARD`. Une route est protégée **sauf si** elle déclare `@Public()`. Oublier le décorateur verrouille une route ; oublier un garde l'aurait ouverte. Le mode de défaillance pointe du bon côté.

### Vérification

`apps/api/test/tenant-isolation.e2e-spec.ts`, contre la vraie base : le cloisonnement vit dans la requête, et un Prisma simulé ne prouverait rien. Sept cas, dont une création de compte où la charge utile tente d'imposer un autre établissement — il est ignoré, pas honoré.

`apps/api/test/invitation.e2e-spec.ts` couvre le jeton : la ligne ne porte ni mot de passe ni jeton en clair, le lien ne sert qu'une fois, un lien expiré et un lien inexistant sont indiscernables, et émettre un nouveau lien tue le précédent.

> **Un défaut trouvé par ce test, et par rien d'autre.** `@UsePipes` s'applique à tous les paramètres d'un gestionnaire : le schéma Zod du corps validait aussi l'objet de session et en retirait `institutionId`. Le cloisonnement disparaissait **en silence**, sans erreur ni avertissement. Seul un test de bout en bout pouvait le voir.

---

## A02 — Défaillances cryptographiques

### Mots de passe

**Argon2id**, la variante à coût mémoire, avec les paramètres par défaut de la bibliothèque. Le choix tient en une phrase : un attaquant qui dispose de cartes graphiques en tire beaucoup moins qu'avec une fonction purement calculatoire.

Le mot de passe en clair n'est jamais stocké, jamais journalisé, et ne figure dans aucune réponse : la lecture d'un compte retient `passwordHash` pour en déduire l'état « invité », puis le retire avant de rendre la ligne. Seul ce qu'il vaut — présent ou absent — sort du service.

### Jeton d'invitation (US-02)

Le lien que l'administrateur transmet porte 256 bits tirés par `randomBytes`. **La base n'en conserve que l'empreinte SHA-256** : un vol de base ne donne pas la main sur un compte en attente de son propriétaire.

SHA-256 et non Argon2, délibérément. Un mot de passe est court et choisi par un humain : il lui faut un hachage lent pour résister à une attaque hors ligne. Ce jeton est aléatoire sur 256 bits — il n'y a rien à deviner, et le seul scénario qui compte est la lecture de la base.

Le jeton en clair n'existe qu'une fois, dans la réponse qui le crée. Il n'est ni stocké, ni journalisé, ni renvoyé par une lecture ultérieure — c'est pourquoi un lien perdu se **régénère** au lieu de se relire, et pourquoi émettre le nouveau rend l'ancien caduc dans la même écriture.

Il voyage dans le corps de la requête et non dans l'URL : une URL s'écrit dans les journaux du serveur et dans l'historique du navigateur, et celui-ci est une information d'authentification tant qu'il n'a pas servi.

**Un compte invité n'a pas d'empreinte de mot de passe du tout.** `password_hash` est nullable, et la connexion refuse explicitement une ligne qui n'en porte pas — avec le même message que tout autre échec, pour ne pas révéler qu'une adresse a été invitée. L'alternative consistait à poser une empreinte inutilisable : elle aurait caché l'état au lieu de le dire, et rien n'aurait empêché de l'oublier.

### Jeton de session

Signé en HS256 par un secret lu dans la configuration. Deux garde-fous au démarrage :

- Le secret est lu par `ConfigService` dans une fabrique `registerAsync`. Une lecture directe de `process.env` au moment de définir le module s'exécuterait **avant** le chargement du `.env` et signerait avec une valeur vide.
- Un secret absent ou plus court que 32 caractères **empêche le démarrage**. Un démarrage réussi avec des sessions falsifiables serait pire qu'une panne.

### Données au repos et en transit

Les données candidats ne quittent pas l'Union européenne : Mistral AI est hébergé en Europe, et le stockage est sur le VPS. Ce n'est pas qu'une préférence — c'est ce qui écarte le Cloud Act américain et simplifie la conformité des établissements clients.

**Limite assumée.** Le volume de stockage n'est pas chiffré au repos. Le chiffrement de disque relève de l'hébergeur et sera traité au lot 7, avec le déploiement.

---

## A07 — Défaillances d'identification et d'authentification

### Un seul message d'échec

Adresse inconnue, mot de passe faux, compte désactivé, compte temporisé : **la même réponse**. Distinguer ces cas transformerait le formulaire en oracle énumérant les adresses existantes — et dans ce produit, une adresse est celle d'un professionnel identifiable.

Le front reproduit la règle plutôt que de la relâcher : afficher « ce compte n'existe pas » côté navigateur rouvrirait l'oracle que l'API ferme.

**Le détail qui compte.** Le mot de passe est haché **même pour une adresse inconnue**. Sans cela, la réponse serait mesurablement plus rapide pour une adresse qui n'existe pas — le même oracle, lu au chronomètre.

### Temporisation par compte

Six échecs consécutifs verrouillent le compte quinze minutes. Le compteur est remis à zéro à chaque connexion réussie.

**Par compte et non par adresse IP**, pour deux raisons symétriques : un attaquant répartit ses tentatives sur de nombreuses adresses, donc un compteur par IP ne protège de rien ; et verrouiller par IP bloquerait tout un établissement derrière une passerelle unique.

**Limite assumée.** Cette mesure ne protège pas d'un _credential stuffing_ réparti sur beaucoup de comptes différents. Une limitation globale au niveau du proxy inverse est la réponse, et relève du lot 7.

### Session

Jeton en cookie `httpOnly`, `sameSite=lax`, `secure` en production, douze heures de validité.

`httpOnly` est le point structurant : le JavaScript de la page **ne peut pas lire le jeton**. Une faille de script inter-sites ne vole donc pas la session. Côté front, `SessionService` ne connaît que l'identité de l'utilisateur, jamais la preuve — il ne peut pas fuiter ce qu'il ne détient pas.

`sameSite=lax` écarte la falsification de requête inter-sites sur les écritures, le front et l'API étant servis sur le même domaine.

### Pas d'inscription libre

Les comptes sont créés par l'administrateur de l'établissement. Il n'y a aucun parcours d'inscription, donc aucune surface d'énumération ni de création automatisée. Un compte créé n'a **aucune empreinte de mot de passe** : `password_hash` est nullable, et la connexion refuse une ligne qui n'en porte pas (voir A02). Il ne devient joignable que lorsque son titulaire parcourt le lien d'invitation, livré avec le lot 2 et décrit en A02, et choisit lui-même son mot de passe.

---

## A10 — Falsification de requête côté serveur : sans objet

**Depuis le 31/08/2026, le serveur n'émet aucune requête vers une adresse fournie par un utilisateur.** L'abandon de l'import Google Drive a supprimé le seul endroit où un identifiant venu du client pouvait orienter un appel sortant.

Les seuls appels sortants vont à l'API Mistral, dont l'adresse est fixe et configurée.

C'est un bénéfice de sécurité **non recherché** de la réduction de périmètre : il est noté ici parce qu'un jury peut légitimement demander pourquoi A10 est vide.

---

## Entrées à écrire

**A03 — Injection**, au lot 3. La décompression d'archive est la seule surface où un contenu entièrement contrôlé par l'utilisateur touche le système de fichiers : RG-07 porte déjà le confinement du chemin résolu, le rejet des entrées non régulières et les plafonds de décompression.

**A04 — Conception non sécurisée**, au lot 4. Les règles RG-01 à RG-06 et la réconciliation RG-09 sont des choix de conception dictés par le risque : un regroupement erroné corrompt deux scores en silence.

**A05 et A06**, au lot 7, avec le déploiement et la chaîne d'intégration continue.

**A08 — Défaut d'intégrité**, au lot 4 : une réponse du modèle est validée contre un schéma avant d'être enregistrée, et une réponse non conforme est rejetée puis réessayée.

**A09 — Journalisation**, au lot 7 avec M-12, même si le journal d'audit est déjà alimenté par le lot 1.
