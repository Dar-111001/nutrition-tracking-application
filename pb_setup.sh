#!/bin/sh
# PocketBase container entrypoint.
#
# 1. Starts PocketBase (all data in $PB_DATA_DIR: a docker volume locally, EFS on ECS).
# 2. Makes sure the admin account, the app's collections, the app login and the
#    built-in foods (seed/foods.json) exist.
#    Every step is idempotent, so it is safe on every start and every redeploy.
#
# Env vars:
#   PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD   required, PocketBase admin (admin UI at /_/)
#   APP_USER_EMAIL, APP_USER_PASSWORD   the app's login; default to the admin pair
#   PB_PORT                             default 8090
#   PB_DATA_DIR                         default /pb/pb_data
#   PB_SEED_FILE                        built-in foods, default /pb_seed/foods.json

ADMIN_EMAIL="${PB_ADMIN_EMAIL}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD}"
APP_EMAIL="${APP_USER_EMAIL:-$PB_ADMIN_EMAIL}"
APP_PASSWORD="${APP_USER_PASSWORD:-$PB_ADMIN_PASSWORD}"
PB_PORT="${PB_PORT:-8090}"
PB_DATA_DIR="${PB_DATA_DIR:-/pb/pb_data}"
PB="http://127.0.0.1:${PB_PORT}"

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set (in .env locally, or in the ECS task definition)"
  exit 1
fi

# ---- 1. Start PocketBase in the background ----
# --automigrate=false: the schema is managed by this script, so PocketBase must not
# write migration files into the (throwaway) container filesystem.
pocketbase serve --http="0.0.0.0:${PB_PORT}" --dir="${PB_DATA_DIR}" --automigrate=false &
PB_PID=$!

echo "Waiting for PocketBase to start..."
for i in $(seq 1 30); do
  if curl -sf "${PB}/api/health" > /dev/null 2>&1; then
    echo "PocketBase ready."
    break
  fi
  sleep 1
done

# ---- Helpers ----
TOKEN=""

# api METHOD PATH [JSON_BODY]
# Calls the PocketBase API as admin. Sets $STATUS (HTTP code) and $BODY (response).
api() {
  RESPONSE=$(curl -s -w '\n%{http_code}' -X "$1" "${PB}$2" \
    -H "Authorization: ${TOKEN}" \
    -H "Content-Type: application/json" \
    ${3:+-d "$3"})
  STATUS=$(printf '%s' "$RESPONSE" | tail -n 1)
  BODY=$(printf '%s' "$RESPONSE" | sed '$d')
}

# report "what was done" — prints an error with the response if the last call failed
report() {
  case "$STATUS" in
    2*) echo "$1" ;;
    *)  echo "ERROR ($1) HTTP ${STATUS}: ${BODY}" ;;
  esac
}

# ---- 2. Admin account ----
# Creating the first admin only works while no admin exists; later starts just log in.
api POST /api/admins "$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" \
  '{email:$e, password:$p, passwordConfirm:$p}')"

api POST /api/admins/auth-with-password "$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" \
  '{identity:$e, password:$p}')"
TOKEN=$(printf '%s' "$BODY" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not log in as admin. Check PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD."
  echo "Response (HTTP ${STATUS}): ${BODY}"
  wait $PB_PID
  exit 0
fi
echo "Admin authenticated."

# ---- 3. Collections ----
# Only signed-in users may read or change data. Rules are re-applied on every start,
# so databases created by older versions (with public "" rules) get locked too.
AUTH_RULE='@request.auth.id != ""'

# ensure_collection NAME SCHEMA_JSON [INDEXES_JSON]
# Creates the collection, or on an existing database adds any fields and indexes
# this version introduced. Existing fields are sent back with their ids, so
# PocketBase keeps their data: this is our (very small) migration step.
ensure_collection() {
  NAME=$1
  SCHEMA=$2
  INDEXES=${3:-[]}
  RULES=$(jq -n --arg r "$AUTH_RULE" \
    '{listRule:$r, viewRule:$r, createRule:$r, updateRule:$r, deleteRule:$r}')

  api GET "/api/collections/${NAME}"
  if [ "$STATUS" = "200" ]; then
    api PATCH "/api/collections/${NAME}" "$(printf '%s' "$BODY" | \
      jq --argjson s "$SCHEMA" --argjson i "$INDEXES" --argjson r "$RULES" '
        (.schema | map(.name)) as $fields
        | (.indexes // []) as $indexes
        | { schema:  (.schema + [$s[] | select(.name | IN($fields[]) | not)]),
            indexes: ($indexes + [$i[] | select(IN($indexes[]) | not)]) } + $r')"
    report "Collection '${NAME}' is up to date, access limited to signed-in users"
  else
    api POST /api/collections "$(jq -n --arg n "$NAME" --argjson s "$SCHEMA" --argjson i "$INDEXES" --argjson r "$RULES" \
      '{name:$n, type:"base", schema:$s, indexes:$i} + $r')"
    report "Created collection '${NAME}'"
  fi
}

ensure_collection food '[
  {"name": "name",             "type": "text",   "required": true},
  {"name": "protein_grams",    "type": "number"},
  {"name": "carbs_grams",      "type": "number"},
  {"name": "fat_grams",        "type": "number"},
  {"name": "protein_portions", "type": "number"},
  {"name": "carbs_portions",   "type": "number"},
  {"name": "fat_portions",     "type": "number"},
  {"name": "date",             "type": "text"}
]'

ensure_collection daily_goals '[
  {"name": "protein_goal", "type": "number"},
  {"name": "carbs_goal",   "type": "number"},
  {"name": "fat_goal",     "type": "number"}
]'

# The food library. `name` is the fallback shown when a language has no name of
# its own. `seed_key` is set only on built-in foods (see step 5) and is unique.
ensure_collection food_items '[
  {"name": "name",             "type": "text",   "required": true},
  {"name": "name_en",          "type": "text"},
  {"name": "name_es",          "type": "text"},
  {"name": "name_he",          "type": "text"},
  {"name": "category",         "type": "text"},
  {"name": "seed_key",         "type": "text"},
  {"name": "protein_per_100g", "type": "number"},
  {"name": "carbs_per_100g",   "type": "number"},
  {"name": "fat_per_100g",     "type": "number"}
]' '[
  "CREATE UNIQUE INDEX `idx_food_items_seed_key` ON `food_items` (`seed_key`) WHERE `seed_key` != \"\""
]'

# Which seed files have been loaded. Admin-only: null rules hide it from the app.
api GET /api/collections/seed_history
if [ "$STATUS" != "200" ]; then
  api POST /api/collections '{"name":"seed_history","type":"base","schema":[{"name":"name","type":"text","required":true}]}'
  report "Created collection 'seed_history'"
fi

# ---- 4. App login ----
# Single-user app: no public sign-up, and one login whose password always matches
# the env var (change APP_USER_PASSWORD and redeploy to change it).
api PATCH /api/collections/users '{"createRule": null}'
report "Public sign-up disabled"

FILTER=$(jq -rn --arg e "$APP_EMAIL" '"email=\"\($e)\"" | @uri')
api GET "/api/collections/users/records?perPage=1&filter=${FILTER}"
USER_ID=$(printf '%s' "$BODY" | jq -r '.items[0].id // empty')
USER=$(jq -n --arg e "$APP_EMAIL" --arg p "$APP_PASSWORD" \
  '{email:$e, password:$p, passwordConfirm:$p, verified:true}')

if [ -n "$USER_ID" ]; then
  api PATCH "/api/collections/users/records/${USER_ID}" "$USER"
else
  api POST /api/collections/users/records "$USER"
fi
report "App login ready for ${APP_EMAIL}"

# ---- 5. Built-in foods ----
# Loads seed/foods.json into the food library, once, like a database migration:
#  - a food is skipped when its seed_key, or any of its names, is already in the
#    library, so foods you added or edited are never touched or duplicated
#  - "foods-v1" is written to seed_history only when every food loaded; a start
#    that fails half way simply loads the rest next time
#  - once recorded, the seed never runs again, so a built-in food you delete
#    stays deleted. A future foods-v2 file would add only its new foods.
SEED_FILE="${PB_SEED_FILE:-/pb_seed/foods.json}"
SEED_NAME=foods-v1

seed_foods() {
  FILTER=$(jq -rn --arg n "$SEED_NAME" '"name=\"\($n)\"" | @uri')
  api GET "/api/collections/seed_history/records?perPage=1&filter=${FILTER}"
  if [ "$STATUS" != "200" ]; then report "Read seed history"; return; fi
  if [ "$(printf '%s' "$BODY" | jq '.items | length')" != "0" ]; then
    echo "Built-in foods (${SEED_NAME}) already loaded."
    return
  fi

  # Every food already in the library, one page of 500 at a time
  WORK=$(mktemp -d)
  PAGE=1
  while :; do
    api GET "/api/collections/food_items/records?page=${PAGE}&perPage=500&skipTotal=1&fields=seed_key,name,name_en,name_es,name_he"
    if [ "$STATUS" != "200" ]; then report "Read food library"; rm -rf "$WORK"; return; fi
    printf '%s' "$BODY" > "${WORK}/page-${PAGE}.json"
    [ "$(printf '%s' "$BODY" | jq '.items | length')" -lt 500 ] && break
    PAGE=$((PAGE + 1))
  done
  jq -s '[.[].items[]]' "$WORK"/page-*.json > "${WORK}/existing.json"

  # The seed foods that are not in the library yet, one JSON object per line
  jq -c --slurpfile have "${WORK}/existing.json" '
    ($have[0] | map(.seed_key | select(. != ""))) as $keys
    | ($have[0] | map(.name, .name_en, .name_es, .name_he | select(. != "") | ascii_downcase)) as $names
    | .[]
    | select(.seed_key | IN($keys[]) | not)
    | select([.name_en, .name_es, .name_he] | map(ascii_downcase) | any(IN($names[])) | not)
    | . + {name: .name_en}' "$SEED_FILE" > "${WORK}/todo.jsonl"

  ADDED=0
  FAILED=0
  while read -r FOOD; do
    api POST /api/collections/food_items/records "$FOOD"
    case "$STATUS" in
      2*) ADDED=$((ADDED + 1)) ;;
      *)  FAILED=$((FAILED + 1)); report "Add $(printf '%s' "$FOOD" | jq -r .seed_key)" ;;
    esac
  done < "${WORK}/todo.jsonl"
  rm -rf "$WORK"

  TOTAL=$(jq length "$SEED_FILE")
  echo "Built-in foods: added ${ADDED}, already present $((TOTAL - ADDED - FAILED)), failed ${FAILED}."
  if [ "$FAILED" = "0" ]; then
    api POST /api/collections/seed_history/records "$(jq -n --arg n "$SEED_NAME" '{name:$n}')"
    report "Recorded ${SEED_NAME} in seed history"
  fi
}
seed_foods

echo "PocketBase setup complete."
wait $PB_PID
