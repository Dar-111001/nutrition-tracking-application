import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireNumber } from '../lib/validate.js';

const GOALS = 'daily_goals';
const FIELDS = ['protein_goal', 'carbs_goal', 'fat_goal'];

const toGoals = (record) => record && {
  protein_goal: record.protein_goal,
  carbs_goal: record.carbs_goal,
  fat_goal: record.fat_goal,
};

// The user's daily macro goals, in portions. There is one goals record;
// PUT creates it the first time and updates it afterwards.
export function goalRoutes({ pocketbase }) {
  const router = Router();

  router.get('/', route(async (req, res) => {
    const [record] = await pocketbase.listAll(GOALS, { token: req.token, sort: '-updated' });
    sendData(res, toGoals(record) || null);
  }));

  router.put('/', route(async (req, res) => {
    const goals = {};
    for (const field of FIELDS) goals[field] = requireNumber(req.body[field], field, { min: 0, max: 100 });

    const [existing] = await pocketbase.listAll(GOALS, { token: req.token, sort: '-updated' });
    const record = existing
      ? await pocketbase.update(GOALS, existing.id, goals, { token: req.token })
      : await pocketbase.create(GOALS, goals, { token: req.token });
    sendData(res, toGoals(record));
  }));

  return router;
}
