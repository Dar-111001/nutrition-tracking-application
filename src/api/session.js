// The signed-in session (token + user), kept in localStorage so a page reload
// keeps you signed in. Components subscribe with onSessionChange().

const STORAGE_KEY = 'nutrition.session';
const listeners = new Set();

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

let current = read();

export function getSession() {
  return current;
}

export function setSession(session) {
  current = session;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the session still works until reload
  }
  listeners.forEach((listener) => listener(session));
}

export function onSessionChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
