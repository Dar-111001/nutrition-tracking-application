#!/bin/sh
# Proves the built-in foods are really in the database, with plain SQL
# (seed/check_seed.sql) against PocketBase's SQLite file.
#
#   docker compose exec pocketbase /pb_seed/check_seed.sh
#
# CI runs the same command against a fresh database. Waits up to
# CHECK_TIMEOUT seconds (default 90) for pb_setup.sh to finish loading first.
# Exits 1 and lists every problem if a check fails.
#
# Built-in foods you deleted on purpose show up as missing: that is expected.

DB="${PB_DATA_DIR:-/pb/pb_data}/data.db"
SEED_FILE="${PB_SEED_FILE:-/pb_seed/foods.json}"
SQL_FILE="${CHECK_SQL_FILE:-/pb_seed/check_seed.sql}"
TIMEOUT="${CHECK_TIMEOUT:-90}"

# pb_setup.sh records foods-v1 as its very last seed step
waited=0
until sqlite3 "$DB" "SELECT 1 FROM seed_history WHERE name = 'foods-v1'" 2>/dev/null | grep -q 1; do
  if [ "$waited" -ge "$TIMEOUT" ]; then
    echo "Gave up after ${TIMEOUT}s waiting for the seed to finish; checking anyway."
    break
  fi
  sleep 2
  waited=$((waited + 2))
done

OUTPUT=$(sqlite3 -cmd ".parameter set @seed_file '${SEED_FILE}'" "$DB" < "$SQL_FILE" 2>&1)
STATUS=$?
echo "$OUTPUT"

if [ "$STATUS" -ne 0 ] || echo "$OUTPUT" | grep -q '^PROBLEM'; then
  echo "Seed check FAILED"
  exit 1
fi
echo "Seed check passed"
