import { ApiError } from './apiError.js';

// Data routes need a signed-in user. PocketBase checks the token on every
// request (its collection rules only allow signed-in users); here we only make
// sure one is present and not expired, because PocketBase silently treats a bad
// token as a guest and would answer with an empty list instead of an error.
export function requireAuth(req, _res, next) {
  const header = req.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (!token) return next(new ApiError('unauthorized', 'Please sign in first.'));
  if (isExpired(token)) return next(new ApiError('unauthorized', 'Your session has expired. Please sign in again.'));

  req.token = token;
  next();
}

// Reads the JWT's exp claim without verifying the signature (PocketBase does that).
function isExpired(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
