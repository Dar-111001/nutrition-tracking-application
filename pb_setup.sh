#!/bin/sh

ADMIN_EMAIL="${PB_ADMIN_EMAIL}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD}"

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ERROR: PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in .env"
  exit 1
fi

# Start PocketBase in the background
pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data &
PB_PID=$!

# Wait until PocketBase HTTP is up
echo "Waiting for PocketBase to start..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8090/api/health > /dev/null 2>&1; then
    echo "PocketBase ready."
    break
  fi
  sleep 1
done

# Try to create the first admin (only works when no admins exist yet)
curl -s -X POST http://localhost:8090/api/admins \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"passwordConfirm\":\"${ADMIN_PASSWORD}\"}" > /dev/null 2>&1
echo "Admin setup attempted."

# Authenticate and extract token with jq
RESPONSE=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo "$RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not authenticate. Check PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in .env"
  echo "Raw response: $RESPONSE"
  wait $PB_PID
  exit 0
fi

echo "Admin authenticated. Token acquired."

# Create a collection if it does not already exist
create_collection() {
  NAME=$1
  SCHEMA=$2

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: ${TOKEN}" \
    "http://localhost:8090/api/collections/${NAME}")

  if [ "$STATUS" = "200" ]; then
    echo "Collection '${NAME}' already exists, skipping."
    return
  fi

  HTTP_CODE=$(curl -s -o /tmp/pb_response.json -w "%{http_code}" \
    -X POST http://localhost:8090/api/collections \
    -H "Authorization: ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$SCHEMA")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "Created collection: ${NAME}"
  else
    echo "ERROR creating collection '${NAME}' (HTTP $HTTP_CODE):"
    cat /tmp/pb_response.json
  fi
}

create_collection "food" '{
  "name": "food",
  "type": "base",
  "listRule": "",
  "viewRule": "",
  "createRule": "",
  "updateRule": "",
  "deleteRule": "",
  "schema": [
    {"name": "name",              "type": "text",   "required": true,  "options": {"min": null, "max": null, "pattern": ""}},
    {"name": "protein_grams",    "type": "number",  "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "carbs_grams",      "type": "number",  "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "fat_grams",        "type": "number",  "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "protein_portions", "type": "number",  "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "carbs_portions",   "type": "number",  "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "fat_portions",     "type": "number",  "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "date",             "type": "text",    "options": {"min": null, "max": null, "pattern": ""}}
  ]
}'

create_collection "daily_goals" '{
  "name": "daily_goals",
  "type": "base",
  "listRule": "",
  "viewRule": "",
  "createRule": "",
  "updateRule": "",
  "deleteRule": "",
  "schema": [
    {"name": "protein_goal", "type": "number", "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "carbs_goal",   "type": "number", "options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "fat_goal",     "type": "number", "options": {"min": null, "max": null, "noDecimal": false}}
  ]
}'

create_collection "food_items" '{
  "name": "food_items",
  "type": "base",
  "listRule": "",
  "viewRule": "",
  "createRule": "",
  "updateRule": "",
  "deleteRule": "",
  "schema": [
    {"name": "name",             "type": "text",  "required": true, "options": {"min": null, "max": null, "pattern": ""}},
    {"name": "protein_per_100g", "type": "number","options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "carbs_per_100g",   "type": "number","options": {"min": null, "max": null, "noDecimal": false}},
    {"name": "fat_per_100g",     "type": "number","options": {"min": null, "max": null, "noDecimal": false}}
  ]
}'

echo "All collections ready. App is live at http://localhost:3000"
wait $PB_PID
