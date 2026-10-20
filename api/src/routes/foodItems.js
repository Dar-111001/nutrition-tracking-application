import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireText, requireNumber, optionalNumber } from '../lib/validate.js';
import { ApiError } from '../lib/apiError.js';
import { kcal } from '../lib/energy.js';

const ITEMS = 'food_items';
const MAX_IMPORT = 1000;

// The languages the app ships in. Each food can have its own name in each one;
// `name` is the fallback the UI shows when the current language has none.
export const LANGUAGES = ['en', 'es', 'he'];

// Menu sections, in display order. Built-in foods (seed/foods.json) use the
// same keys; foods saved without a category land in "other".
export const CATEGORIES = [
  'protein', 'dairy_eggs', 'grains', 'legumes', 'vegetables',
  'fruit', 'nuts_seeds', 'fats_oils', 'snacks_sweets', 'drinks', 'alcohol', 'other',
];

// A typical serving, shown next to a food ("1 shot ≈ 40 g"). Values always
// stay per 100 g; the serving is only a hint for how much to log.
export const SERVING_UNITS = ['shot', 'glass', 'bottle', 'pint', 'can'];

const per100g = (value, field) => requireNumber(value, field, { min: 0, max: 100 });
const MACROS = {
  protein_per_100g: per100g,
  carbs_per_100g: per100g,
  fat_per_100g: per100g,
  // Only drinks have alcohol, so it may be left out (counts as 0)
  alcohol_per_100g: (value, field) => optionalNumber(value, field, { min: 0, max: 100 }),
};

const optionalText = (value, field) =>
  (value === undefined || value === null || value === '' ? '' : requireText(value, field));

function readCategory(value) {
  if (value === undefined || value === null || value === '') return 'other';
  if (!CATEGORIES.includes(value)) {
    throw new ApiError('validation', `category must be one of: ${CATEGORIES.join(', ')}.`, { field: 'category' });
  }
  return value;
}

// { serving: { unit: "shot", grams: 40 } } -> { serving_unit, serving_grams }; null clears it
function readServing(serving) {
  if (serving === null || serving === '') return { serving_unit: '', serving_grams: 0 };
  if (typeof serving !== 'object' || Array.isArray(serving) || !SERVING_UNITS.includes(serving.unit)) {
    throw new ApiError('validation', `serving must be null or like { "unit": "shot", "grams": 40 }, with unit one of: ${SERVING_UNITS.join(', ')}.`, { field: 'serving' });
  }
  return { serving_unit: serving.unit, serving_grams: requireNumber(serving.grams, 'serving.grams', { min: 1, max: 2000 }) };
}

// { names: { en, es, he } } -> { name_en, name_es, name_he }; missing languages become ''
function readNames(names) {
  if (typeof names !== 'object' || names === null || Array.isArray(names)) {
    throw new ApiError('validation', 'names must be an object like { "en": "Apple", "he": "תפוח" }.', { field: 'names' });
  }
  return Object.fromEntries(LANGUAGES.map((lang) => [`name_${lang}`, optionalText(names[lang], `names.${lang}`)]));
}

// The fallback name: the one sent as `name`, else the first language that has one
function fallbackName(body, columns) {
  if (body.name !== undefined && body.name !== '') return requireText(body.name, 'name');
  const name = LANGUAGES.map((lang) => columns[`name_${lang}`]).find(Boolean);
  if (!name) throw new ApiError('validation', 'Give the food a name in at least one language.', { field: 'names' });
  return name;
}

// A full food, for create and import
function validateItem(input) {
  const body = input ?? {};
  const names = readNames(body.names ?? {});
  const item = { ...names, name: fallbackName(body, names), category: readCategory(body.category) };
  for (const [field, validate] of Object.entries(MACROS)) item[field] = validate(body[field], field);
  if (body.serving !== undefined) Object.assign(item, readServing(body.serving));
  return item;
}

// Only the fields that were sent, for PATCH. seed_key is never accepted from
// the browser: only the database seed can mark a food as built-in.
function validateChanges(input) {
  const body = input ?? {};
  const changes = {};
  if (body.names !== undefined) Object.assign(changes, readNames(body.names));
  if (body.names !== undefined || body.name !== undefined) changes.name = fallbackName(body, changes);
  if (body.category !== undefined) changes.category = readCategory(body.category);
  if (body.serving !== undefined) Object.assign(changes, readServing(body.serving));
  for (const [field, validate] of Object.entries(MACROS)) {
    if (body[field] !== undefined) changes[field] = validate(body[field], field);
  }
  if (Object.keys(changes).length === 0) {
    throw new ApiError('validation', `Send at least one of: names, name, category, serving, ${Object.keys(MACROS).join(', ')}.`);
  }
  return changes;
}

const toItem = (record) => ({
  id: record.id,
  name: record.name,
  names: Object.fromEntries(LANGUAGES.map((lang) => [lang, record[`name_${lang}`] || ''])),
  category: CATEGORIES.includes(record.category) ? record.category : 'other',
  builtin: Boolean(record.seed_key),
  protein_per_100g: record.protein_per_100g,
  carbs_per_100g: record.carbs_per_100g,
  fat_per_100g: record.fat_per_100g,
  alcohol_per_100g: record.alcohol_per_100g || 0,
  kcal_per_100g: kcal({
    protein: record.protein_per_100g, carbs: record.carbs_per_100g, fat: record.fat_per_100g, alcohol: record.alcohol_per_100g,
  }),
  serving: SERVING_UNITS.includes(record.serving_unit) && record.serving_grams > 0
    ? { unit: record.serving_unit, grams: record.serving_grams }
    : null,
});

// The food library: foods with their macros per 100 g.
export function foodItemRoutes({ pocketbase }) {
  const router = Router();

  router.get('/', route(async (req, res) => {
    const records = await pocketbase.listAll(ITEMS, { token: req.token, sort: 'name' });
    sendData(res, records.map(toItem));
  }));

  router.post('/', route(async (req, res) => {
    const record = await pocketbase.create(ITEMS, validateItem(req.body), { token: req.token });
    sendData(res, toItem(record), 201);
  }));

  // POST /api/food-items/import  { items: [...] }  (the frontend parses the CSV)
  // Valid rows are saved even if others fail; the response lists every failed row.
  router.post('/import', route(async (req, res) => {
    const rows = req.body?.items;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new ApiError('validation', 'Send { "items": [...] } with at least one food.');
    }
    if (rows.length > MAX_IMPORT) {
      throw new ApiError('validation', `Import at most ${MAX_IMPORT} foods at a time.`);
    }

    const created = [];
    const failed = [];
    for (const [index, row] of rows.entries()) {
      try {
        created.push(toItem(await pocketbase.create(ITEMS, validateItem(row), { token: req.token })));
      } catch (err) {
        if (err.code === 'unauthorized') throw err;
        const name = row?.name || LANGUAGES.map((lang) => row?.names?.[lang]).find(Boolean) || null;
        failed.push({ index, name, message: err.message });
      }
    }
    sendData(res, { created: created.length, failed });
  }));

  router.patch('/:id', route(async (req, res) => {
    const record = await pocketbase.update(ITEMS, req.params.id, validateChanges(req.body), { token: req.token });
    sendData(res, toItem(record));
  }));

  router.delete('/:id', route(async (req, res) => {
    await pocketbase.remove(ITEMS, req.params.id, { token: req.token });
    sendData(res, { id: req.params.id });
  }));

  return router;
}
