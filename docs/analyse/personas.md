# Personas

Trois profils, dont un seul est un utilisateur direct du produit. Le troisième — le candidat — n'ouvre jamais Probo, mais ses droits contraignent la conception ; l'oublier serait passer à côté de la moitié des obligations RGPD.

---

## Claire — responsable des admissions

**Utilisateur principal. C'est pour elle que le produit est conçu.**

Responsable des admissions dans une école de commerce privée de 600 étudiants. Encadre deux chargés d'admission pendant les pics de campagne.

**Son quotidien en campagne.** Entre février et mai, elle reçoit 400 à 700 candidatures. Chaque dossier contient trois à cinq fichiers, déposés par les candidats via un formulaire, puis rassemblés dans un dossier Drive partagé par son équipe. Elle consacre environ trois semaines pleines au premier tri.

**Son aisance technique.** Bonne utilisatrice bureautique. Manipule Drive et Excel sans difficulté. N'installe pas de logiciel, ne lit pas de documentation, et abandonne un outil qui demande plus de dix minutes de prise en main.

**Ce qui la freine aujourd'hui.**

- Le tri manuel est épuisant et la qualité de son jugement se dégrade nettement après deux heures.
- Elle sait que des dossiers sont mal constitués — un portfolio nommé « CV », une lettre de recommandation prise pour une lettre de motivation — mais elle ne les repère qu'au cas par cas.
- Quand un candidat conteste un refus, elle n'a aucune trace de ce qui a motivé la décision.

**Ce qu'elle attend de Probo.** Un classement dans lequel elle a confiance, et surtout la certitude que les dossiers douteux lui seront signalés plutôt que notés au hasard.

**Sa méfiance légitime.** Elle ne croit pas qu'une IA puisse décider à sa place, et elle a raison. Elle acceptera un outil qui **ordonne et justifie**, pas un outil qui tranche. Chaque score doit être accompagné d'une raison lisible, et elle doit pouvoir contredire l'outil.

**Ce qui la ferait abandonner.** Un classement sans explication. Un faux positif silencieux — un bon dossier écarté sans qu'elle le sache. Un outil qui l'oblige à réorganiser ses fichiers avant de pouvoir les importer.

---

## Marc — administrateur de l'établissement

**Utilisateur occasionnel. Il configure, il ne trie pas.**

Responsable du service scolarité ou du système d'information, selon la taille de l'établissement. Ouvre Probo trois ou quatre fois par campagne.

**Ses tâches.** Créer les comptes de son équipe, ouvrir une campagne et définir ses critères, exporter le classement final pour la commission d'admission.

**Sa préoccupation dominante : la conformité.** Il doit pouvoir répondre à son responsable RGPD sur trois points — où sont hébergées les données, combien de temps elles sont conservées, et qui y a accédé. Il a besoin que ces réponses soient accessibles sans passer par un support technique.

**Sa contrainte.** Sa DSI refuse en général de connecter un compte Google à une application tierce, et instruit toute demande de connexion à un service tiers avec plusieurs semaines de délai. **C'est ce qui justifie de s'en tenir au dépôt d'archive** : un fichier qu'on téléverse ne demande l'autorisation de personne, et ne crée aucun lien permanent entre le système d'information de l'école et Probo. Un argument de vente autant qu'une simplification technique.

**Ce qui le rassure.** Un hébergement européen, une durée de conservation affichée, un journal d'audit consultable, et la possibilité de révoquer un accès lui-même sans demander à personne.

---

## Sofia — candidate

**N'utilise jamais Probo. Ses droits contraignent pourtant la conception.**

Candidate à une formation. Dépose son dossier sur le site de l'école et ne saura probablement jamais que Probo existe.

**Pourquoi elle figure ici.** Ses données personnelles — nom, parcours, lettre de motivation — sont traitées par un outil qu'elle ne voit pas. Le RGPD lui accorde des droits que le produit doit rendre exerçables, même sans interface pour elle.

**Ce que cela impose concrètement.**

| Droit                            | Conséquence sur le produit                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Droit à l'effacement             | Suppression complète d'une candidature, fichiers compris, déclenchable par l'établissement             |
| Limitation de la conservation    | Purge automatique à 90 jours, sans intervention                                                        |
| Droit d'accès et à l'explication | Les justifications de chaque score sont stockées et restituables ; le score n'est jamais un chiffre nu |
| Traçabilité                      | Journal d'audit conservé indépendamment de la purge des candidatures                                   |

**Le risque à écarter.** Si Sofia conteste un refus, l'établissement doit pouvoir expliquer ce qui a été analysé. Un score sans justification, ou une analyse dont on ignore avec quel prompt elle a été produite, est indéfendable — d'où le stockage de `prompt_version` sur chaque analyse.

---

## Ce que les personas imposent au produit

Trois exigences non négociables se déduisent directement de ces profils :

1. **Aucun score sans justification lisible.** Claire ne fera pas confiance à un chiffre nu, et Sofia a le droit à une explication.
2. **Les documents atypiques sont signalés avant tout calcul, pas notés au hasard.** C'est la demande centrale de Claire, et la raison d'être du niveau 1.
3. **L'établissement garde la main sur ses accès et ses données.** Marc doit pouvoir révoquer et supprimer sans passer par nous.
