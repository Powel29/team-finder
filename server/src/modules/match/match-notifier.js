import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { loadMember, recommendMembers, scoreRole } from './match.service.js';
import { teamInclude, toTeamDto } from '../teams/teams.dto.js';
import { notify } from '../notifications/notifications.service.js';

const THRESHOLD = 70;
const MAX_PER_PROFILE_UPDATE = 5;
const MAX_PER_ROLE = 20;
const CANDIDATES_PER_ROLE = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

/** True when this (role, member) pair already produced a NEW_MATCH notification for `recipientId` today. */
const alreadyNotified = (recipientId, pairKey) =>
  prisma.notification.findFirst({
    where: {
      userId: recipientId,
      type: 'NEW_MATCH',
      createdAt: { gte: new Date(Date.now() - DAY_MS) },
      data: { path: ['pairKey'], equals: pairKey },
    },
    select: { id: true },
  });

async function notifyOnce(recipientId, roleId, memberUserId, payload) {
  const pairKey = `${roleId}:${memberUserId}`;
  if (await alreadyNotified(recipientId, pairKey)) return false;
  await notify(recipientId, {
    type: 'NEW_MATCH',
    ...payload,
    data: { pairKey, roleId, userId: memberUserId, score: payload.score },
  });
  return true;
}

/** A profile was created or changed: tell owners of open roles that this person is a strong match. */
export async function scanForMember(userId) {
  const member = await loadMember(userId);
  if (!member?.isDiscoverable) return 0;

  const teams = await prisma.team.findMany({
    where: {
      status: 'OPEN',
      ownerId: { not: userId },
      members: { none: { userId } },
      roles: { some: { filled: { lt: prisma.role.fields.slots } } },
    },
    include: teamInclude,
    take: 300,
  });

  const hits = [];
  for (const team of teams) {
    const dto = toTeamDto(team);
    for (const role of dto.roles.filter((r) => r.open > 0)) {
      const match = scoreRole(role, dto.type, member);
      if (match.score >= THRESHOLD) hits.push({ team: dto, role, score: match.score });
    }
  }

  let sent = 0;
  for (const { team, role, score } of hits.sort((a, b) => b.score - a.score)) {
    if (sent >= MAX_PER_PROFILE_UPDATE) break;
    const created = await notifyOnce(team.owner.id, role.id, userId, {
      score,
      title: 'New match for your team',
      body: `${member.name} is a ${score}% match for ${role.title} in ${team.name}`,
      link: `/people/${userId}?roleId=${role.id}`,
    });
    if (created) sent += 1;
  }
  return sent;
}

/** A role was created or edited: tell strong-matching members about it. */
export async function scanForRole(roleId) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { team: { select: { id: true, name: true, ownerId: true, status: true } } },
  });
  if (!role || role.team.status !== 'OPEN' || role.filled >= role.slots) return 0;

  const candidates = await recommendMembers(role.team.ownerId, roleId, {
    minScore: THRESHOLD,
    limit: MAX_PER_ROLE,
    cap: CANDIDATES_PER_ROLE,
  });
  let sent = 0;
  for (const candidate of candidates) {
    const created = await notifyOnce(candidate.userId, roleId, candidate.userId, {
      score: candidate.match.score,
      title: 'New role matches your skills',
      body: `${role.title} in ${role.team.name} is a ${candidate.match.score}% match for you`,
      link: `/teams/${role.team.id}`,
    });
    if (created) sent += 1;
  }
  return sent;
}

/** Fire-and-forget after the HTTP response; errors are logged and swallowed. Disabled in tests, which call the scans directly. */
const defer = (label, task) => {
  if (env.isTest) return;
  setImmediate(() => task().catch((err) => logger.error({ err, label }, 'NEW_MATCH scan failed')));
};

export const scheduleMemberScan = (userId) => defer('member', () => scanForMember(userId));
export const scheduleRoleScan = (roleId) => defer('role', () => scanForRole(roleId));
export const scheduleTeamScan = (teamId) =>
  defer('team', async () => {
    const roles = await prisma.role.findMany({ where: { teamId }, select: { id: true } });
    for (const role of roles) await scanForRole(role.id);
  });
