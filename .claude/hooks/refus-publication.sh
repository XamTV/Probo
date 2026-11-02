#!/usr/bin/env bash
# Arrête les commandes qui publient quelque chose hors du poste de travail.
#
# CLAUDE.md demande l'accord explicite de l'auteur avant de pousser sur
# `origin` ou d'ouvrir une pull request. Cette garantie a été enfreinte deux
# fois tant qu'elle n'était qu'un rappel dans un fichier : elle est déplacée
# ici, où c'est le harnais qui arrête l'appel, pas la mémoire de l'assistant.
#
# `deny` et non `ask`, et c'est un retour en arrière assumé. `ask` lit mieux
# la consigne — « toujours s'arrêter pour », pas « ne jamais » — mais il
# délègue la décision au mode de permission de la session : à son premier
# usage réel, une fusion de pull request est passée sans qu'aucune demande
# n'atteigne l'auteur. Un garde-fou qui dépend d'un réglage par ailleurs
# modifiable n'est pas un garde-fou.
#
# Le coût est réel : l'auteur tape lui-même chaque publication. C'est le prix
# d'une garantie qui ne dépend de rien.
#
# `git commit` a rejoint la liste le 02/11/2026. La première version l'en
# excluait, au motif qu'aucune commande ne distingue un commit demandé d'un
# commit spontané et qu'un commit local se défait sans trace. Le raisonnement
# tenait ; le résultat non — trois commits non sollicités en un mois. Le coût
# d'une demande est inférieur à celui d'une relecture qu'on n'a pas faite.
#
# Tout le reste de `git` et de `gh` passe : seuls l'enregistrement, la
# publication et l'ouverture ou la fusion d'une pull request sont refusés.
set -euo pipefail

commande=$(jq -r '.tool_input.command // empty')
[ -n "$commande" ] || exit 0

# Le verbe doit être en **position de commande** : début de chaîne, ou juste
# après un séparateur de shell. Sans cette ancre, le seul fait de *mentionner*
# la commande bloquerait l'appel — c'est arrivé au premier essai, sur le
# message du commit qui installe ce hook.
debut='(^|[;&|(){}]|[[:space:]]&&|[[:space:]]\|\|)[[:space:]]*'

# Et le verbe doit être un mot entier. Le terminateur n'est pas que l'espace :
# `git push; echo fini` et `(git push)` échappaient à une ancre qui n'acceptait
# que l'espace ou la fin de chaîne.
fin='([[:space:];&|(){}]|$)'

# Les options de `git` peuvent porter une valeur détachée (`git -C chemin push`) :
# chaque drapeau consomme donc, facultativement, le jeton qui le suit.
pousse="${debut}git[[:space:]]+(-[^[:space:]]+[[:space:]]+([^-[:space:]][^[:space:]]*[[:space:]]+)?)*push${fin}"
publie="${debut}gh[[:space:]]+pr[[:space:]]+(create|merge)${fin}"
# `commit`, `commit --amend`, et toute option détachée avant lui.
enregistre="${debut}git[[:space:]]+(-[^[:space:]]+[[:space:]]+([^-[:space:]][^[:space:]]*[[:space:]]+)?)*commit${fin}"

if printf '%s' "$commande" | grep -Eq "$pousse|$publie|$enregistre"; then
  raison="Commit, poussée sur origin, ouverture ou fusion d'une pull request : ces commandes reviennent à l'auteur seul, après sa relecture (CLAUDE.md, « Mode de travail »). Refus imposé par .claude/hooks/refus-publication.sh — présenter le travail à relire et la commande prête à coller, puis passer la main."
  jq -n --arg r "$raison" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
fi

exit 0
