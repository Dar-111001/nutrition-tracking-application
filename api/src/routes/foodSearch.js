import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireText } from '../lib/validate.js';
import { ApiError } from '../lib/apiError.js';
import { fetchWithTimeout, readJson } from '../lib/http.js';

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// GET /api/food-search?q=banana
// Looks up macros per 100 g on OpenFoodFacts (free, no key). Going through the
// API gives the browser one origin, a timeout, and the same error contract.
export function foodSearchRoutes({ openFoodFactsUrl, foodSearchTimeoutMs }) {
  const router = Router();

  router.get('/', route(async (req, res) => {
    const query = requireText(req.query.q, 'q', { max: 100 });
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
    if (response.status === 429 || response.status === 503) {
      throw new ApiError('rate_limited', 'Food search is busy right now. Try again in a minute.');
    }
    const payload = await readJson(response);
    if (!response.ok || !payload) {
      throw new ApiError('server', `OpenFoodFacts returned an error (HTTP ${response.status}).`);
    }

    const results = (payload.products || [])
      .filter((p) => p.product_name?.trim() && p.nutriments
        && ['proteins_100g', 'carbohydrates_100g', 'fat_100g'].every((k) => p.nutriments[k] !== undefined))
      .slice(0, 5)
      .map((p) => ({
        name: p.product_name.trim(),
        protein_per_100g: round1(p.nutriments.proteins_100g),
        carbs_per_100g: round1(p.nutriments.carbohydrates_100g),
        fat_per_100g: round1(p.nutriments.fat_100g),
      }));
    sendData(res, results);
  }));

  return router;
}
