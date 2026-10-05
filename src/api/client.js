import { getSession, setSession } from './session';

// Every call to our API goes through apiRequest(), and it never throws.
// It always resolves to the same shape the server uses:
//
//   { ok: true,  data }
//   { ok: false, error: { code, message, details } }
//
// `code` is one of: network | timeout | rate_limited | validation |
// unauthorized | not_found | server | unknown. Show `message` next to the
// control that triggered the call; branch on `code`, never on the text.

const API_BASE = '/api'; // same origin: nginx (or the Vite dev server) forwards it to the API
const DEFAULT_TIMEOUT_MS = 10000;

const failure = (code, message, details = null) => ({ ok: false, error: { code, message, details } });

export async function apiRequest(method, path, { body, query, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return failure('timeout', `The server did not respond within ${timeoutMs / 1000} seconds.`);
    }
    return navigator.onLine === false
      ? failure('network', 'You are offline. Check your connection and try again.')
      : failure('network', 'Could not reach the server. Check your connection and try again.');
  }

  const result = await response.json().catch(() => null);
  const isEnvelope = result && typeof result.ok === 'boolean' && (result.ok ? 'data' in result : result.error);
  if (!isEnvelope) {
    return failure('server', `The server sent an unexpected response (HTTP ${response.status}).`);
  }

  // A rejected token means the session is over: signing out shows the login screen
  if (!result.ok && result.error.code === 'unauthorized' && token) setSession(null);
  return result;
}
