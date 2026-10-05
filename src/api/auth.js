import { apiRequest } from './client';
import { getSession, setSession, onSessionChange } from './session';

// Sign in, sign out and session state for the UI. Login goes through our API,
// which checks the password with PocketBase and returns a signed token.

export async function login(email, password) {
  const result = await apiRequest('POST', '/auth/login', { body: { email, password } });
  if (result.ok) setSession(result.data);
  return result;
}

export function logout() {
  setSession(null);
}

export function isLoggedIn() {
  return Boolean(getSession()?.token);
}

export function currentUser() {
  return getSession()?.user || null;
}

// Swaps the stored token for a fresh one. A rejected token signs the user out
// (apiRequest does that); a network failure keeps the session for later.
export async function refresh() {
  if (!isLoggedIn()) return null;
  const result = await apiRequest('POST', '/auth/refresh');
  if (result.ok) setSession(result.data);
  return result;
}

export { onSessionChange as onChange };
