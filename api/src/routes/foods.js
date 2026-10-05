import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireDate, requireText, requireNumber, pickPresent } from '../lib/validate.js';
import { ApiError } from '../lib/apiError.js';

const FOOD = 'food';

// One macro portion = 30 g protein, 30 g carbs or 10 g fat.
// Computed here so every client gets the same numbers.
const PORTION_GRAMS = { protein: 30, carbs: 30, fat: 10 };
const toPortions = (grams, size) => Math.round((grams / size) * 10) / 10;

function withPortions(food) {
  const out = { ...food };
  for (const [macro, size] of Object.entries(PORTION_GRAMS)) {
    if (food[`${macro}_grams`] !== undefined) {
      out[`${macro}_portions`] = toPortions(food[`${macro}_grams`], size);
    }
  }
  return out;
}

const grams = (value, field) => requireNumber(value, field, { min: 0, max: 5000 });
const FIELDS = {
  name: (value, field) => requireText(value, field),
  protein_grams: grams,
  carbs_grams: grams,
  fat_grams: grams,
  date: requireDate,
};

const toFood = (record) => ({
  id: record.id,
  name: record.name,
  date: record.date,
  protein_grams: record.protein_grams,
  carbs_grams: record.carbs_grams,
  fat_grams: record.fat_grams,
  protein_portions: record.protein_portions,
  carbs_portions: record.carbs_portions,
  fat_portions: record.fat_portions,
  created: record.created,
});

// Logged foods. Dates are the user's local calendar day, sent as YYYY-MM-DD.
export function foodRoutes({ pocketbase }) {
  const router = Router();

  // GET /api/foods?date=2026-10-05            one day
  // GET /api/foods?from=2026-09-06&to=2026-10-05   a range (the monthly view)
  router.get('/', route(async (req, res) => {
    const { date, from, to } = req.query;
    let filter;
    if (date) {
      filter = `date = "${requireDate(date, 'date')}"`;
    } else if (from && to) {
      filter = `date >= "${requireDate(from, 'from')}" && date <= "${requireDate(to, 'to')}"`;
    } else {
      throw new ApiError('validation', 'Send either ?date= or both ?from= and ?to=.');
    }
    const records = await pocketbase.listAll(FOOD, { token: req.token, filter, sort: '-created' });
    sendData(res, records.map(toFood));
  }));

  router.post('/', route(async (req, res) => {
    const food = {};
    for (const [field, validate] of Object.entries(FIELDS)) food[field] = validate(req.body[field], field);
    const record = await pocketbase.create(FOOD, withPortions(food), { token: req.token });
    sendData(res, toFood(record), 201);
  }));

  router.patch('/:id', route(async (req, res) => {
    const changes = withPortions(pickPresent(req.body, FIELDS));
    const record = await pocketbase.update(FOOD, req.params.id, changes, { token: req.token });
    sendData(res, toFood(record));
  }));

  router.delete('/:id', route(async (req, res) => {
    await pocketbase.remove(FOOD, req.params.id, { token: req.token });
    sendData(res, { id: req.params.id });
  }));

  // DELETE /api/foods?date=2026-10-05  clears one day. Reports what failed
  // instead of stopping halfway silently.
  router.delete('/', route(async (req, res) => {
    const date = requireDate(req.query.date, 'date');
    const records = await pocketbase.listAll(FOOD, { token: req.token, filter: `date = "${date}"` });
    const results = await Promise.allSettled(
      records.map((record) => pocketbase.remove(FOOD, record.id, { token: req.token })),
    );
    const failed = records.filter((_, i) => results[i].status === 'rejected').map((record) => record.id);
    if (failed.length) {
      throw new ApiError('server', `Could not delete ${failed.length} of ${records.length} foods. Try again.`, { failed });
    }
    sendData(res, { deleted: records.length });
  }));

  return router;
}
