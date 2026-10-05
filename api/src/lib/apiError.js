// The fixed list of error codes the API can return. The frontend switches on
// `code` (never on the message text), so this list is part of the contract.
export const ERROR_CODES = {
  validation:   400, // the request is malformed or a field is invalid
  unauthorized: 401, // missing, expired or rejected login token
  not_found:    404, // the route or record does not exist
  rate_limited: 429, // an upstream service asked us to slow down
  server:       502, // PocketBase or OpenFoodFacts failed or is unreachable
  timeout:      504, // an upstream service did not answer in time
  unknown:      500, // a bug in this API
};

// Throw one of these anywhere in a route; the error handler turns it into
// { ok: false, error: { code, message, details } } with the matching HTTP status.
export class ApiError extends Error {
  constructor(code, message, details = null) {
    super(message);
    if (!(code in ERROR_CODES)) throw new Error(`Unknown error code "${code}"`);
    this.code = code;
    this.status = ERROR_CODES[code];
    this.details = details;
  }
}
