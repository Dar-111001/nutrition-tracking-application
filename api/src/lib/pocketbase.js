import { ApiError } from './apiError.js';
import { fetchWithTimeout, readJson } from './http.js';

// The only place that talks to PocketBase. Routes call these helpers and
// never see PocketBase's own response shapes or error format.
export function createPocketBase({ pocketbaseUrl, upstreamTimeoutMs }) {
  async function request(method, path, { token, body, query } = {}) {
    const url = new URL(pocketbaseUrl + path);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = token;

    const response = await fetchWithTimeout(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      timeoutMs: upstreamTimeoutMs,
      service: 'The database',
    });
    const payload = await readJson(response);
    if (response.ok) return payload;
    throw toApiError(response.status, payload);
  }

  // PocketBase errors look like { code, message, data: { field: { code, message } } }
  function toApiError(status, payload) {
    const fields = payload?.data && Object.keys(payload.data).length ? payload.data : null;
    if (status === 400) {
      return new ApiError('validation', payload?.message || 'The database rejected the request.', fields);
    }
    if (status === 401 || status === 403) {
      return new ApiError('unauthorized', 'Your session has expired. Please sign in again.');
    }
    if (status === 404) return new ApiError('not_found', 'That record no longer exists.');
    if (status === 429) return new ApiError('rate_limited', 'Too many requests. Wait a moment and try again.');
    return new ApiError('server', `The database returned an error (HTTP ${status}).`);
  }

  const records = (collection) => `/api/collections/${collection}/records`;

  return {
    async health() {
      return request('GET', '/api/health');
    },

    async login(collection, identity, password) {
      return request('POST', `/api/collections/${collection}/auth-with-password`, {
        body: { identity, password },
      });
    },

    async refresh(collection, token) {
      return request('POST', `/api/collections/${collection}/auth-refresh`, { token });
    },

    // Reads every page, so callers get a plain array
    async listAll(collection, { token, filter, sort } = {}) {
      const items = [];
      for (let page = 1; ; page++) {
        const result = await request('GET', records(collection), {
          token,
          query: { page, perPage: 500, filter, sort, skipTotal: 1 },
        });
        items.push(...result.items);
        if (result.items.length < 500) return items;
      }
    },

    async create(collection, data, { token }) {
      return request('POST', records(collection), { token, body: data });
    },

    async update(collection, id, data, { token }) {
      return request('PATCH', `${records(collection)}/${encodeURIComponent(id)}`, { token, body: data });
    },

    async remove(collection, id, { token }) {
      await request('DELETE', `${records(collection)}/${encodeURIComponent(id)}`, { token });
    },
  };
}
