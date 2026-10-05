import { ApiError } from './apiError.js';

// The API contract. Every response body has exactly one of these two shapes:
//
//   success: { "ok": true,  "data": <any> }
//   failure: { "ok": false, "error": { "code": "<ERROR_CODES key>", "message": "<for humans>", "details": <any|null> } }

export function sendData(res, data, status = 200) {
  res.status(status).json({ ok: true, data });
}

export function sendError(res, err, status) {
  const apiError = err instanceof ApiError
    ? err
    : new ApiError('unknown', 'Something went wrong on the server.');
  res.status(status || apiError.status).json({
    ok: false,
    error: { code: apiError.code, message: apiError.message, details: apiError.details },
  });
}

// Wraps an async route so a thrown or rejected error reaches the error handler.
export const route = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
