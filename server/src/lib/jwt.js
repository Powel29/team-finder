import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'tf_token';
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const signSessionToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, purpose: 'session' }, env.JWT_SECRET, { expiresIn: '7d' });

export const signSocketToken = (userId) =>
  jwt.sign({ sub: userId, purpose: 'socket' }, env.JWT_SECRET, { expiresIn: 60 });

/** Returns the payload when the token is valid for the given purpose, otherwise null. */
export function verifyToken(token, purpose) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return payload.purpose === purpose ? payload : null;
  } catch {
    return null;
  }
}

export const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd && !env.SERVE_CLIENT ? 'none' : 'lax',
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export const clearCookieOptions = () => {
  const { maxAge: _maxAge, ...rest } = cookieOptions();
  return rest;
};
