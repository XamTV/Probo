#!/usr/bin/env bash
#
# Recette : l'application démarre pour de vrai, et on entre par la porte.
#
# Les tests de bout en bout appellent l'API dans le même processus. Ils ne
# construisent rien, n'ouvrent aucun port, ne passent par aucune passerelle.
# Quatre défauts ont vécu dans cet angle mort le 03/11/2026 : aucun compte
# créable, les contrats non construits au démarrage, le .env introuvable
# depuis le binaire construit, et le serveur de développement sans route vers
# l'API. Ce script est la marche au-dessus.
#
# Il part du dépôt construit, démarre le binaire de production et le serveur de
# développement, puis se connecte et travaille comme un utilisateur.

set -euo pipefail

racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$racine"

journal="$(mktemp -d)"
cookies="$journal/cookies.txt"
api_port="${API_PORT:-3000}"
web_port="${WEB_PORT:-4200}"
base="http://localhost:$web_port"

pids=()

nettoie() {
  local code=$?
  for pid in "${pids[@]:-}"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
  if [ $code -ne 0 ]; then
    echo
    echo "--- Échec. Journaux : ---"
    for fichier in "$journal"/*.log; do
      [ -e "$fichier" ] || continue
      echo "=== $(basename "$fichier") ==="
      tail -40 "$fichier"
    done
  fi
  rm -rf "$journal"
  exit $code
}
trap nettoie EXIT

etape() { echo; echo "▸ $*"; }

# Attend qu'une URL réponde, quel que soit le code : on veut un serveur vivant,
# pas encore un serveur d'accord. Abandonne dès que le processus meurt, plutôt
# que d'attendre la fin du délai pour annoncer ce qui est déjà su.
attends() {
  local url=$1 quoi=$2 pid=$3 essais=${4:-120}
  for _ in $(seq 1 "$essais"); do
    if curl -s -o /dev/null --max-time 2 "$url"; then return 0; fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "✗ $quoi s'est arrêté avant de répondre."
      return 1
    fi
    sleep 1
  done
  echo "✗ $quoi n'a pas répondu sur $url"
  return 1
}

# Vérifie le code HTTP ET que la réponse est bien du JSON. Le serveur de
# développement répond 200 en HTML pour toute route inconnue : sans ce second
# contrôle, une passerelle absente passerait pour un succès.
verifie() {
  local attendu=$1 methode=$2 chemin=$3 corps=${4:-}
  local args=(-s -b "$cookies" -c "$cookies" -o "$journal/reponse" -w '%{http_code} %{content_type}')
  [ -n "$corps" ] && args+=(-H 'Content-Type: application/json' -d "$corps")

  read -r code type <<<"$(curl "${args[@]}" -X "$methode" "$base$chemin")"

  if [ "$code" != "$attendu" ]; then
    echo "✗ $methode $chemin → $code, attendu $attendu"
    head -c 400 "$journal/reponse"
    return 1
  fi
  case "$type" in
    application/json*) ;;
    *)
      echo "✗ $methode $chemin → $code mais $type, pas du JSON."
      echo "  La passerelle du serveur de développement ne mène probablement pas à l'API."
      return 1
      ;;
  esac
  echo "  ✓ $methode $chemin → $code"
}

etape "Construction complète"
npm run build

etape "Migrations et comptes de développement"
# deploy, pas dev : il applique ce qui existe sans jamais proposer d'écrire une
# migration, ce qui est le seul comportement acceptable hors du poste.
npm run db:deploy -w @probo/api
npm run db:seed

# Le binaire construit, pas la source : c'est lui qui part en production, et
# c'est lui qui a cessé de démarrer quand la sortie de compilation a bougé.
etape "Démarrage de l'API construite"
node apps/api/dist/main > "$journal/api.log" 2>&1 &
pids+=($!)
attends "http://localhost:$api_port/api/health" "l'API" "${pids[-1]}"

etape "Démarrage du serveur de développement"
npm run start -w @probo/web > "$journal/web.log" 2>&1 &
pids+=($!)
attends "$base/" "le serveur de développement" "${pids[-1]}"

etape "Parcours d'un administrateur"
verifie 200 POST /api/auth/login '{"email":"admin@probo.test","password":"ProboDemo2026!"}'
verifie 200 GET /api/auth/me
verifie 200 GET /api/campaigns
verifie 201 POST /api/campaigns '{"name":"Campagne de recette"}'

etape "US-02 — le lien d'invitation mène à un compte utilisable"
# Le parcours complet, à travers la passerelle : l'administrateur crée un
# compte, le compte invité ne peut pas se connecter, son propriétaire pose son
# mot de passe, et le lien ne resert pas.
invite="recette-$(date +%s)@probo.test"
verifie 201 POST /api/users "{\"email\":\"$invite\",\"name\":\"Compte de recette\",\"role\":\"ADMISSIONS_OFFICER\"}"
jeton=$(sed -n 's/.*"invitationToken":"\([^"]*\)".*/\1/p' "$journal/reponse")
if [ -z "$jeton" ]; then
  echo "✗ La création d'un compte n'a pas renvoyé de lien d'invitation."
  exit 1
fi
verifie 401 POST /api/auth/login "{\"email\":\"$invite\",\"password\":\"ProboRecette2026!\"}"
verifie 200 POST /api/auth/invitation "{\"token\":\"$jeton\",\"password\":\"ProboRecette2026!\"}"
verifie 200 POST /api/auth/login "{\"email\":\"$invite\",\"password\":\"ProboRecette2026!\"}"
verifie 401 POST /api/auth/invitation "{\"token\":\"$jeton\",\"password\":\"ProboRecette2026!\"}"

etape "Un mot de passe faux reste un 401, pas une panne"
verifie 401 POST /api/auth/login '{"email":"admin@probo.test","password":"ce-mot-de-passe-est-faux"}'

echo
echo "✓ Recette passée : l'application démarre, la passerelle mène à l'API, et on s'y connecte."
