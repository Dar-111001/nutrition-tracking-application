import { ApiError } from './apiError.js';

// Small, explicit validators. Each one returns the clean value or throws a
// `validation` ApiError naming the field, so the UI can show it next to the input.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function requireDate(value, field) {
  if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ApiError('validation', `${field} must be a date like 2026-10-05.`, { field });
  }
  return value;
}

export function requireText(value, field, { max = 200 } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new ApiError('validation', `${field} is required.`, { field });
  if (text.length > max) throw new ApiError('validation', `${field} must be at most ${max} characters.`, { field });
  return text;
}

export function requireNumber(value, field, { min = 0, max = 100000 } = {}) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) {
    throw new ApiError('validation', `${field} must be a number between ${min} and ${max}.`, { field });
  }
  return number;
}

export function optionalNumber(value, field, options) {
  return value === undefined || value === null || value === '' ? 0 : requireNumber(value, field, options);
}

// Copies only the listed fields that are present (for PATCH requests).
export function pickPresent(body, validators) {
  const out = {};
  for (const [field, validate] of Object.entries(validators)) {
    if (body[field] !== undefined) out[field] = validate(body[field], field);
  }
  if (Object.keys(out).length === 0) {
    throw new ApiError('validation', `Send at least one of: ${Object.keys(validators).join(', ')}.`);
  }
  return out;
}
