import { AppError } from '../lib/errors.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth on top of SameSite cookies and JSON-only bodies:
 * state-changing requests that carry an Origin header must come from an allowed origin.
 */
export const originCheck = (allowedOrigins) => (req, _res, next) => {
  const origin = req.headers.origin;
  if (SAFE.has(req.method) || !origin) return next();
  let sameHost = false;
  try {
    sameHost = new URL(origin).host === req.headers.host;
  } catch {
    // an unparseable Origin is rejected below
  }
  if (sameHost || allowedOrigins.includes(origin)) return next();
  next(new AppError(403, 'FORBIDDEN', 'Origin not allowed'));
};
