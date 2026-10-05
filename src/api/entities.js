import { apiRequest } from './client';

// One object per resource of our API. Every function resolves to
// { ok: true, data } or { ok: false, error } (see client.js) and never throws.
// Dates are the user's local calendar day as YYYY-MM-DD.

export const Food = {
  listByDate: (date) => apiRequest('GET', '/foods', { query: { date } }),
  listRange: (from, to) => apiRequest('GET', '/foods', { query: { from, to } }),
  // { name, protein_grams, carbs_grams, fat_grams, date }; the API adds the portions
  create: (food) => apiRequest('POST', '/foods', { body: food }),
  update: (id, changes) => apiRequest('PATCH', `/foods/${encodeURIComponent(id)}`, { body: changes }),
  delete: (id) => apiRequest('DELETE', `/foods/${encodeURIComponent(id)}`),
  clearDay: (date) => apiRequest('DELETE', '/foods', { query: { date } }),
};

export const DailyGoals = {
  get: () => apiRequest('GET', '/goals'), // data is null until goals are saved
  save: (goals) => apiRequest('PUT', '/goals', { body: goals }),
};

export const FoodItem = {
  list: () => apiRequest('GET', '/food-items'),
  create: (item) => apiRequest('POST', '/food-items', { body: item }),
  update: (id, changes) => apiRequest('PATCH', `/food-items/${encodeURIComponent(id)}`, { body: changes }),
  delete: (id) => apiRequest('DELETE', `/food-items/${encodeURIComponent(id)}`),
  // data: { created, failed: [{ index, name, message }] }
  importMany: (items) => apiRequest('POST', '/food-items/import', { body: { items }, timeoutMs: 60000 }),
};

// Macros per 100 g from OpenFoodFacts, via our API
export const searchFood = (query) => apiRequest('GET', '/food-search', { query: { q: query }, timeoutMs: 15000 });
