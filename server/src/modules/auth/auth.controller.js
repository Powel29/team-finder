import * as auth from './auth.service.js';
import { COOKIE_NAME, clearCookieOptions, cookieOptions } from '../../lib/jwt.js';

const sendSession = (res, status, { user, token }) => {
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.status(status).json({ user });
};

export const register = async (req, res) => sendSession(res, 201, await auth.register(req.valid.body));
export const login = async (req, res) => sendSession(res, 200, await auth.login(req.valid.body));

export const logout = (_req, res) => {
  res.clearCookie(COOKIE_NAME, clearCookieOptions());
  res.status(204).end();
};

export const me = async (req, res) => res.json(await auth.me(req.user.id));
export const socketToken = (req, res) => res.json(auth.socketToken(req.user.id));
