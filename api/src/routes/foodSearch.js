import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireText } from '../lib/validate.js';
import { ApiError } from '../lib/apiError.js';
import { fetchWithTimeout, readJson } from '../lib/http.js';
import { LANGUAGES } from './foodItems.js';

const MAX_RESULTS = 5;
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

const toResult = (source, name, macros) => ({
  source,
  name,
  protein_per_100g: round1(macros.protein_per_100g),
  carbs_per_100g: round1(macros.carbs_per_100g),
  fat_per_100g: round1(macros.fat_per_100g),
});

// GET /api/food-search?q=egg
// Looks in two places and returns up to 5 matches from each:
//   1. the user's own food library (the 100 built-in foods plus their own), in
//      any language. Instant, and works with no internet access.
//   2. OpenFoodFacts (free, no key), for everything else.
// If OpenFoodFacts fails but the library found something, the library matches
// are still returned; the error is only shown when there is nothing to offer.
export function foodSearchRoutes({ pocketbase, openFoodFactsUrl, foodSearchTimeoutMs }) {
  const router = Router();

  router.get('/', route(async (req, res) => {
    const query = requireText(req.query.q, 'q', { max: 100 });
    const library = await searchLibrary(pocketbase, req.token, query);

    let online = [];
    try {
      online = await searchOpenFoodFacts(query, { openFoodFactsUrl, foodSearchTimeoutMs });
    } catch (err) {
      if (library.length === 0) throw err;
    }
    sendData(res, [...library, ...online]);
  }));

  return router;
}

async function searchLibrary(pocketbase, token, query) {
  const needle = query.toLowerCase();
  const records = await pocketbase.listAll('food_items', { token, sort: 'name' });
  const matches = records
    .map((record) => {
      const names = [record.name, ...LANGUAGES.map((lang) => record[`name_${lang}`])]
        .filter(Boolean).map((name) => name.toLowerCase());
      // 0 = a name starts with the query, 1 = a name contains it
      const rank = names.some((name) => name.startsWith(needle)) ? 0
        : names.some((name) => name.includes(needle)) ? 1 : null;
      return { record, rank };
    })
    .filter((m) => m.rank !== null)
    .sort((a, b) => a.rank - b.rank);
  return matches.slice(0, MAX_RESULTS).map(({ record }) => toResult('library', record.name, record));
}

// OpenFoodFacts' search allows about 10 requests per minute from one IP
// address and answers 503 when it is overloaded. Both are shared limits on
// their side, so the messages say what is going on instead of blaming the user.
async function searchOpenFoodFacts(query, { openFoodFactsUrl, foodSearchTimeoutMs }) {
  const url = new URL(`${openFoodFactsUrl}/cgi/search.pl`);
  url.search = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
    fields: 'product_name,nutriments',
  });

  const response = await fetchWithTimeout(url, {
    // OpenFoodFacts asks every client to identify itself
    headers: { 'User-Agent': 'nutrition-tracking-application/1.0 (teaching demo)' },
    timeoutMs: foodSearchTimeoutMs,
    service: 'OpenFoodFacts',
  });
  if (response.status === 429) {
    throw new ApiError('rate_limited',
      'OpenFoodFacts allows about 10 searches a minute from this server and that limit is used up. '
      + 'Wait a minute, or type the values in yourself.');
  }
  if (response.status === 503) {
    throw new ApiError('server', 'OpenFoodFacts search is overloaded right now (HTTP 503). Try again later, or type the values in yourself.');
  }
  const payload = await readJson(response);
  if (!response.ok || !payload) {
    throw new ApiError('server', `OpenFoodFacts returned an error (HTTP ${response.status}).`);
  }

  return (payload.products || [])
    .filter((p) => p.product_name?.trim() && p.nutriments
      && ['proteins_100g', 'carbohydrates_100g', 'fat_100g'].every((k) => p.nutriments[k] !== undefined))
    .slice(0, MAX_RESULTS)
    .map((p) => toResult('openfoodfacts', p.product_name.trim(), {
      protein_per_100g: p.nutriments.proteins_100g,
      carbs_per_100g: p.nutriments.carbohydrates_100g,
      fat_per_100g: p.nutriments.fat_100g,
    }));
}
