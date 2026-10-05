#!/bin/sh
# PocketBase container entrypoint.
#
# 1. Starts PocketBase (all data in $PB_DATA_DIR: a docker volume locally, EFS on ECS).
# 2. Makes sure the admin account, the app's collections and the app login exist.
#    Every step is idempotent, so it is safe on every start and every redeploy.
#
# Env vars:
#   PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD   required, PocketBase admin (admin UI at /_/)
#   APP_USER_EMAIL, APP_USER_PASSWORD   the app's login; default to the admin pair
#   PB_PORT                             default 8090
#   PB_DATA_DIR                         default /pb/pb_data

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

# ensure_collection NAME SCHEMA_JSON
ensure_collection() {
  NAME=$1
  SCHEMA=$2
  RULES=$(jq -n --arg r "$AUTH_RULE" \
    '{listRule:$r, viewRule:$r, createRule:$r, updateRule:$r, deleteRule:$r}')

  api GET "/api/collections/${NAME}"
  if [ "$STATUS" = "200" ]; then
    api PATCH "/api/collections/${NAME}" "$RULES"
    report "Collection '${NAME}' exists, access limited to signed-in users"
  else
    api POST /api/collections "$(jq -n --arg n "$NAME" --argjson s "$SCHEMA" --argjson r "$RULES" \
      '{name:$n, type:"base", schema:$s} + $r')"
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

ensure_collection food_items '[
  {"name": "name",             "type": "text",   "required": true},
  {"name": "protein_per_100g", "type": "number"},
  {"name": "carbs_per_100g",   "type": "number"},
  {"name": "fat_per_100g",     "type": "number"}
]'

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

echo "PocketBase setup complete."
wait $PB_PID
