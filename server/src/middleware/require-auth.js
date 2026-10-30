import { COOKIE_NAME, verifyToken } from '../lib/jwt.js';
import { AppError } from '../lib/errors.js';

export function requireAuth(req, _res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const payload = verifyToken(req.cookies?.[COOKIE_NAME] ?? bearer, 'session');
  if (!payload) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue'));
  req.user = { id: payload.sub, email: payload.email };
  next();
}
