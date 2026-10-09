#!/usr/bin/env bash
# Rejoue chaque cas de cas-refus-publication.tsv contre le hook.
#
# À lancer par `npm run test:hook` après toute retouche au motif. Le hook a
# produit trois défauts le jour de son installation — un refus de la commande
# qui l'installait, deux contournements par un séparateur de shell — et aucun
# n'était visible autrement qu'en l'exécutant.
set -uo pipefail

ici=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
hook="${1:-$ici/refus-publication.sh}"
cas="${2:-$ici/cas-refus-publication.tsv}"
echecs=0

while IFS=$'\t' read -r attendu commande; do
  case "${attendu:-}" in '' | '#'*) continue ;; esac

  charge=$(jq -Rn --arg c "$commande" '{tool_name:"Bash", tool_input:{command:$c}}')
  # Le hook n'écrit rien quand il laisse passer : jq sur une entrée vide ne
  # produit aucune valeur, donc le défaut se décide ici, pas dans le filtre.
  sortie=$(printf '%s' "$charge" | "$hook")
  if [ -z "$sortie" ]; then
    obtenu=passe
  else
    obtenu=$(printf '%s' "$sortie" | jq -r '.hookSpecificOutput.permissionDecision')
  fi

  if [ "$obtenu" = "$attendu" ]; then
    printf '  ok     %-6s %s\n' "$obtenu" "$commande"
  else
    printf '  ÉCHEC  attendu %s, obtenu %s : %s\n' "$attendu" "$obtenu" "$commande"
    echecs=$((echecs + 1))
  fi
done <"$cas"

echo
if [ "$echecs" -eq 0 ]; then
  echo "Tous les cas passent."
else
  echo "$echecs cas en échec."
fi
exit $((echecs > 0 ? 1 : 0))
