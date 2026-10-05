import { ApiError } from './apiError.js';

// fetch() with a timeout. Network failures and timeouts become ApiErrors that
// name the service, so a student reading the response knows what broke.
export async function fetchWithTimeout(url, { timeoutMs, service, ...options }) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new ApiError('timeout', `${service} did not respond within ${timeoutMs / 1000}s.`);
    }
    throw new ApiError('server', `${service} is unreachable.`, { cause: err.cause?.code || err.message });
  }
}

export async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
