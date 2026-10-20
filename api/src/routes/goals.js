import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireNumber, optionalNumber } from '../lib/validate.js';
import { kcalFromPortions } from '../lib/energy.js';

const GOALS = 'daily_goals';

// The goal is calories. Protein, carbs and fat (in portions) are only a
// suggested split: 0 means "no suggestion of my own", and the app then
// suggests one from the calorie goal.
const FIELDS = {
  calorie_goal: (value, field) => requireNumber(value, field, { min: 500, max: 10000 }),
  protein_goal: (value, field) => optionalNumber(value, field, { min: 0, max: 100 }),
  carbs_goal: (value, field) => optionalNumber(value, field, { min: 0, max: 100 }),
  fat_goal: (value, field) => optionalNumber(value, field, { min: 0, max: 100 }),
};

const toGoals = (record) => record && {
  // Goals saved before the calorie goal existed get the calories their portions add up to
  calorie_goal: record.calorie_goal
    || kcalFromPortions({ protein: record.protein_goal, carbs: record.carbs_goal, fat: record.fat_goal })
    || null,
  protein_goal: record.protein_goal || 0,
  carbs_goal: record.carbs_goal || 0,
  fat_goal: record.fat_goal || 0,
};

// The user's daily goals. There is one goals record;
// PUT creates it the first time and updates it afterwards.
export function goalRoutes({ pocketbase }) {
  const router = Router();

  router.get('/', route(async (req, res) => {
    const [record] = await pocketbase.listAll(GOALS, { token: req.token, sort: '-updated' });
    sendData(res, toGoals(record) || null);
  }));

  router.put('/', route(async (req, res) => {
    const goals = {};
    for (const [field, validate] of Object.entries(FIELDS)) goals[field] = validate(req.body[field], field);

    const [existing] = await pocketbase.listAll(GOALS, { token: req.token, sort: '-updated' });
    const record = existing
      ? await pocketbase.update(GOALS, existing.id, goals, { token: req.token })
      : await pocketbase.create(GOALS, goals, { token: req.token });
    sendData(res, toGoals(record));
  }));

  return router;
}
