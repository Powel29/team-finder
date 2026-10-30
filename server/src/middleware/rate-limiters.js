import { rateLimit } from 'express-rate-limit';

const handler = (_req, res) =>
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' } });

const limiter = (max) =>
  rateLimit({ windowMs: 60_000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, handler });

export const createAuthLimiter = (max = 10) => limiter(max);
export const createGeneralLimiter = (max = 300) => limiter(max);
