-- Checks, straight against PocketBase's SQLite file, that the built-in foods
-- of one seed file really are in the database. Run by seed/check_seed.sh, once
-- per seed file. Each query lists problems; no rows means that check passed.
-- @seed_file is the path to the file and @seed_name its seed_history name
-- (set with .parameter by the script).

.bail on
.headers off
.mode list

-- The seed file as a table: one row per food
CREATE TEMP TABLE seed AS
SELECT value ->> 'seed_key' AS seed_key,
       value ->> 'name_en'  AS name_en,
       value ->> 'name_es'  AS name_es,
       value ->> 'name_he'  AS name_he
FROM json_each(readfile(@seed_file));

-- 1. The load was recorded, so it finished without a single failed food
SELECT 'PROBLEM: ' || @seed_name || ' is not recorded in seed_history, so the load did not finish'
WHERE NOT EXISTS (SELECT 1 FROM seed_history WHERE name = @seed_name);

-- 2. Every seed food is in the library: by its seed_key, or (like pb_setup.sh)
--    by a food you already had with the same name
SELECT 'PROBLEM: missing built-in food ' || s.seed_key
FROM seed s
WHERE NOT EXISTS (SELECT 1 FROM food_items f WHERE f.seed_key = s.seed_key)
  AND NOT EXISTS (
    SELECT 1 FROM food_items f
    WHERE lower(s.name_en) IN (lower(f.name), lower(f.name_en), lower(f.name_es), lower(f.name_he))
       OR lower(s.name_es) IN (lower(f.name), lower(f.name_en), lower(f.name_es), lower(f.name_he))
       OR lower(s.name_he) IN (lower(f.name), lower(f.name_en), lower(f.name_es), lower(f.name_he)));

-- 3. Built-in foods have a name in every language and a known category
SELECT 'PROBLEM: built-in food ' || seed_key || ' is missing a name or has an unknown category'
FROM food_items
WHERE seed_key != ''
  AND (name_en = '' OR name_es = '' OR name_he = ''
       OR category NOT IN ('protein', 'dairy_eggs', 'grains', 'legumes', 'vegetables',
                           'fruit', 'nuts_seeds', 'fats_oils', 'snacks_sweets', 'drinks', 'alcohol'));

-- 4. Foods that came with a typical serving (drinks) still have it
SELECT 'PROBLEM: built-in food ' || f.seed_key || ' has no serving size'
FROM json_each(readfile(@seed_file)) j
JOIN food_items f ON f.seed_key = j.value ->> 'seed_key'
WHERE (j.value ->> 'serving_grams') IS NOT NULL
  AND (f.serving_grams IS NULL OR f.serving_grams <= 0 OR f.serving_unit IS NULL OR f.serving_unit = '');

-- Summary: this file's built-in foods per category
SELECT @seed_name || ' ' || f.category || ': ' || COUNT(*)
FROM food_items f JOIN seed s ON s.seed_key = f.seed_key
GROUP BY f.category ORDER BY f.category;
SELECT @seed_name || ' total: ' || COUNT(*) || ' of ' || (SELECT COUNT(*) FROM seed) || ' in the seed file'
FROM food_items f JOIN seed s ON s.seed_key = f.seed_key;
