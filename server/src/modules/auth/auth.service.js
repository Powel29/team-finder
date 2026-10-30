import { prisma } from '../../lib/prisma.js';
import { AppError, conflict } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signSessionToken, signSocketToken } from '../../lib/jwt.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = '$2b$04$abcdefghijklmnopqrstuuYBBZcOZc9Cpg4bT6B0jGtfxKQ7WZ5Ee';

export async function register({ name, email, password }) {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw conflict('CONFLICT', 'An account with this email already exists');
  }
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  return { user: publicUser(user), token: signSessionToken(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
  return { user: publicUser(user), token: signSessionToken(user) };
}

export async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      memberProfile: { select: { id: true } },
      _count: { select: { ownedTeams: true, notifications: { where: { readAt: null } } } },
    },
  });
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Account no longer exists');
  return {
    user: publicUser(user),
    hasMemberProfile: Boolean(user.memberProfile),
    unreadNotifications: user._count.notifications,
    ownedTeamCount: user._count.ownedTeams,
  };
}

export const socketToken = (userId) => ({ token: signSocketToken(userId) });
