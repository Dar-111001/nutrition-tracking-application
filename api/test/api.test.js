// End-to-end tests for the API with a fake PocketBase and a fake OpenFoodFacts.
// Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

// A token whose exp is far in the future (the API only reads exp; PocketBase verifies)
const jwt = (exp) => `x.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.y`;
const TOKEN = jwt(Math.floor(Date.now() / 1000) + 3600);
const EXPIRED = jwt(Math.floor(Date.now() / 1000) - 60);

// ---- fake upstreams ----
const db = { food: [], daily_goals: [], food_items: [] };
let pbDown = false;
let pbSlow = false;
let failDeletes = false;
let nextId = 1;

function fakePocketBase(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://pb');
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (pbSlow) return setTimeout(() => send(200, {}), 500);
    if (pbDown) return send(500, { code: 500, message: 'boom', data: {} });
    if (url.pathname === '/api/health') return send(200, { code: 200, message: 'API is healthy.' });

    if (url.pathname === '/api/collections/users/auth-with-password') {
      const { identity, password } = JSON.parse(body);
      if (identity === 'me@example.com' && password === 'secret') {
        return send(200, { token: TOKEN, record: { id: 'u1', email: identity } });
      }
      return send(400, { code: 400, message: 'Failed to authenticate.', data: {} });
    }

    const m = url.pathname.match(/^\/api\/collections\/(\w+)\/records(?:\/(\w+))?$/);
    if (!m) return send(404, { code: 404, message: 'Not found', data: {} });
    if (req.headers.authorization !== TOKEN) return send(403, { code: 403, message: 'Forbidden', data: {} });
    const [, collection, id] = m;
    const rows = db[collection];

    if (req.method === 'GET') {
      let items = rows;
      const filter = url.searchParams.get('filter');
      const day = filter?.match(/^date = "(.+)"$/);
      if (day) items = rows.filter((r) => r.date === day[1]);
      return send(200, { page: 1, perPage: 500, items });
    }
    if (req.method === 'POST') {
      const record = { id: `r${nextId++}`, created: new Date().toISOString(), ...JSON.parse(body) };
      rows.push(record);
      return send(200, record);
    }
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return send(404, { code: 404, message: 'Not found', data: {} });
    if (req.method === 'PATCH') {
      Object.assign(rows[index], JSON.parse(body));
      return send(200, rows[index]);
    }
    if (req.method === 'DELETE') {
      if (failDeletes && rows[index].name === 'b') return send(500, { code: 500, message: 'boom', data: {} });
      rows.splice(index, 1);
      res.writeHead(204); return res.end();
    }
  });
}

function fakeOpenFoodFacts(req, res) {
  const q = new URL(req.url, 'http://off').searchParams.get('search_terms');
  if (q === 'busy') { res.writeHead(429); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ products: [
    { product_name: 'Banana', nutriments: { proteins_100g: 1.09, carbohydrates_100g: 22.84, fat_100g: 0.33 } },
    { product_name: 'No macros', nutriments: {} },
  ] }));
}

// ---- helpers ----
const servers = [];
let base;
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));

before(async () => {
  const pb = http.createServer(fakePocketBase);
  const off = http.createServer(fakeOpenFoodFacts);
  servers.push(pb, off);
  const app = createApp({
    port: 0,
    healthcheck: { port: 0, path: '/api/health' },
    pocketbaseUrl: await listen(pb),
    openFoodFactsUrl: await listen(off),
    upstreamTimeoutMs: 200,
    foodSearchTimeoutMs: 200,
  });
  const api = http.createServer(app);
  servers.push(api);
  base = await listen(api);
});

after(() => servers.forEach((s) => { s.closeAllConnections(); s.close(); }));

async function call(method, path, { body, token = TOKEN, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  return { status: res.status, body: await res.json() };
}

function assertError(result, status, code) {
  assert.equal(result.status, status);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.error.code, code);
  assert.equal(typeof result.body.error.message, 'string');
  assert.ok('details' in result.body.error);
}

// ---- tests ----
test('liveness check answers without PocketBase', async () => {
  pbDown = true;
  const r = await call('GET', '/api/health', { token: null });
  pbDown = false;
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.data.status, 'ok');
});

test('readiness check reflects PocketBase', async () => {
  assert.equal((await call('GET', '/api/ready', { token: null })).status, 200);
  pbDown = true;
  const r = await call('GET', '/api/ready', { token: null });
  pbDown = false;
  assertError(r, 503, 'server');
});

test('login returns a session, wrong password is unauthorized', async () => {
  const ok = await call('POST', '/api/auth/login', { token: null, body: { email: 'me@example.com', password: 'secret' } });
  assert.deepEqual(ok.body, { ok: true, data: { token: TOKEN, user: { id: 'u1', email: 'me@example.com' } } });
  assertError(await call('POST', '/api/auth/login', { token: null, body: { email: 'me@example.com', password: 'nope' } }), 401, 'unauthorized');
  assertError(await call('POST', '/api/auth/login', { token: null, body: { email: '' } }), 400, 'validation');
});

test('data routes need a valid, unexpired token', async () => {
  assertError(await call('GET', '/api/food-items', { token: null }), 401, 'unauthorized');
  assertError(await call('GET', '/api/food-items', { token: EXPIRED }), 401, 'unauthorized');
  assertError(await call('GET', '/api/food-items', { token: jwt(Math.floor(Date.now() / 1000) + 60) }), 401, 'unauthorized');
});

test('logging a food validates input and computes portions', async () => {
  const bad = await call('POST', '/api/foods', { body: { name: 'Egg', protein_grams: 'lots', carbs_grams: 1, fat_grams: 5, date: '2026-10-05' } });
  assertError(bad, 400, 'validation');
  assert.equal(bad.body.error.details.field, 'protein_grams');

  const ok = await call('POST', '/api/foods', { body: { name: ' Egg ', protein_grams: 12, carbs_grams: 1, fat_grams: 10, date: '2026-10-05' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.name, 'Egg');
  assert.equal(ok.body.data.protein_portions, 0.4);
  assert.equal(ok.body.data.fat_portions, 1);

  const day = await call('GET', '/api/foods?date=2026-10-05');
  assert.equal(day.body.data.length, 1);
  assertError(await call('GET', '/api/foods'), 400, 'validation');
  assertError(await call('GET', '/api/foods?date=2026-10-05" || 1=1'), 400, 'validation');
});

test('clearing a day reports partial failures', async () => {
  for (const name of ['a', 'b', 'c']) {
    await call('POST', '/api/foods', { body: { name, protein_grams: 1, carbs_grams: 1, fat_grams: 1, date: '2026-10-04' } });
  }
  failDeletes = true;
  const partial = await call('DELETE', '/api/foods?date=2026-10-04');
  failDeletes = false;
  assertError(partial, 502, 'server');
  assert.ok(partial.body.error.details.failed.length > 0);

  const ok = await call('DELETE', '/api/foods?date=2026-10-04');
  assert.equal(ok.body.ok, true);
  assert.equal((await call('GET', '/api/foods?date=2026-10-04')).body.data.length, 0);
});

test('goals are created then updated, and validated', async () => {
  assert.equal((await call('GET', '/api/goals')).body.data, null);
  assertError(await call('PUT', '/api/goals', { body: { protein_goal: '', carbs_goal: 4, fat_goal: 3 } }), 400, 'validation');
  await call('PUT', '/api/goals', { body: { protein_goal: 5, carbs_goal: 4, fat_goal: 3 } });
  await call('PUT', '/api/goals', { body: { protein_goal: 6, carbs_goal: 4, fat_goal: 3 } });
  assert.equal(db.daily_goals.length, 1);
  assert.deepEqual((await call('GET', '/api/goals')).body.data, { protein_goal: 6, carbs_goal: 4, fat_goal: 3 });
});

test('import saves valid rows and lists the failed ones', async () => {
  const r = await call('POST', '/api/food-items/import', { body: { items: [
    { name: 'Rice', protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3 },
    { name: '', protein_per_100g: 1, carbs_per_100g: 1, fat_per_100g: 1 },
    { name: 'Oil', protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 'x' },
  ] } });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.data.created, 1);
  assert.deepEqual(r.body.data.failed.map((f) => f.index), [1, 2]);
});

test('food search proxies OpenFoodFacts and maps rate limits', async () => {
  const r = await call('GET', '/api/food-search?q=banana');
  assert.deepEqual(r.body.data, [{ name: 'Banana', protein_per_100g: 1.1, carbs_per_100g: 22.8, fat_per_100g: 0.3 }]);
  assertError(await call('GET', '/api/food-search?q=busy'), 429, 'rate_limited');
  assertError(await call('GET', '/api/food-search'), 400, 'validation');
});

test('upstream timeouts and errors keep the contract', async () => {
  pbSlow = true;
  const slow = await call('GET', '/api/food-items');
  pbSlow = false;
  assertError(slow, 504, 'timeout');

  assertError(await call('PATCH', '/api/food-items/missing', { body: { name: 'x' } }), 404, 'not_found');
  assertError(await call('GET', '/api/nope'), 404, 'not_found');
  assertError(await call('POST', '/api/foods', { raw: '{bad json' }), 400, 'validation');
});
