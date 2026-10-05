import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireText, requireNumber, pickPresent } from '../lib/validate.js';
import { ApiError } from '../lib/apiError.js';

const ITEMS = 'food_items';
const MAX_IMPORT = 1000;

const per100g = (value, field) => requireNumber(value, field, { min: 0, max: 100 });
const FIELDS = {
  name: (value, field) => requireText(value, field),
  protein_per_100g: per100g,
  carbs_per_100g: per100g,
  fat_per_100g: per100g,
};

function validateItem(body) {
  const item = {};
  for (const [field, validate] of Object.entries(FIELDS)) item[field] = validate(body?.[field], field);
  return item;
}

const toItem = (record) => ({
  id: record.id,
  name: record.name,
  protein_per_100g: record.protein_per_100g,
  carbs_per_100g: record.carbs_per_100g,
  fat_per_100g: record.fat_per_100g,
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
        failed.push({ index, name: row?.name ?? null, message: err.message });
      }
    }
    sendData(res, { created: created.length, failed });
  }));

  router.patch('/:id', route(async (req, res) => {
    const record = await pocketbase.update(ITEMS, req.params.id, pickPresent(req.body, FIELDS), { token: req.token });
    sendData(res, toItem(record));
  }));

  router.delete('/:id', route(async (req, res) => {
    await pocketbase.remove(ITEMS, req.params.id, { token: req.token });
    sendData(res, { id: req.params.id });
  }));

  return router;
}
