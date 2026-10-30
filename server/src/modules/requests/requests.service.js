import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, conflict, forbidden, notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { emitToUser } from '../../lib/socket.js';
import { getMatch } from '../match/match.service.js';
import { notify } from '../notifications/notifications.service.js';
import { assertOwner } from '../teams/team-guards.js';
import { recomputeTeamStatus } from '../teams/team-status.js';
import { publishTeamChange } from '../teams/team-events.js';
import { lockRequest, lockRole } from '../teams/team-locks.js';
import { notifyCancelledRequests, notifyRoleFilled, notifyTeamClosed } from '../teams/team-notifications.js';
import { requestInclude, toRequestDto } from './requests.dto.js';

const isUniqueViolation = (err) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
const typeWord = (type) => (type === 'INVITE' ? 'invite' : 'request');

const emitRequestChange = (request, status = request.status) => {
  emitToUser(request.senderId, 'requests:changed', { requestId: request.id, status });
  emitToUser(request.recipientId, 'requests:changed', { requestId: request.id, status });
};

/** Shared checks for sending a request or invite about a role. */
async function loadOpenRole(teamId, roleId, memberUserId) {
  const role = await prisma.role.findFirst({
    where: { id: roleId, teamId },
    include: { team: { select: { id: true, name: true, ownerId: true, status: true } } },
  });
  if (!role) throw notFound('Role');
  const { team } = role;
  if (await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: memberUserId } } })) {
    throw conflict('ALREADY_MEMBER', 'Already a member of this team');
  }
  if (team.status !== 'OPEN' || role.filled >= role.slots)
    throw conflict('ROLE_FULL', 'This role is already filled or the team is not recruiting');
  return role;
}

async function assertNoPending(roleId, memberUserId, ownerId) {
  const existing = await prisma.request.findFirst({
    where: {
      roleId,
      status: 'PENDING',
      OR: [
        { senderId: memberUserId, recipientId: ownerId },
        { senderId: ownerId, recipientId: memberUserId },
      ],
    },
  });
  if (existing) throw conflict('DUPLICATE_REQUEST', 'There is already a pending request or invite for this role');
}

async function createRequest(data) {
  try {
    return await prisma.request.create({ data, include: requestInclude });
  } catch (err) {
    if (isUniqueViolation(err))
      throw conflict('DUPLICATE_REQUEST', 'There is already a pending request or invite for this role');
    throw err;
  }
}

async function scoreFor(userId, roleId) {
  try {
    return (await getMatch(userId, roleId)).score;
  } catch {
    return null;
  }
}

export async function sendJoinRequest(userId, { teamId, roleId, message }) {
  if (!(await prisma.memberProfile.findUnique({ where: { userId }, select: { id: true } }))) {
    throw new AppError(400, 'PROFILE_REQUIRED', 'Create your profile before requesting to join a team');
  }
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { ownerId: true } });
  if (!team) throw notFound('Team');
  if (team.ownerId === userId) throw forbidden('You cannot request to join your own team');

  const role = await loadOpenRole(teamId, roleId, userId);
  await assertNoPending(roleId, userId, team.ownerId);
  const request = await createRequest({
    type: 'JOIN_REQUEST',
    teamId,
    roleId,
    senderId: userId,
    recipientId: team.ownerId,
    message,
    matchScore: await scoreFor(userId, roleId),
  });

  emitRequestChange(request);
  await notify(team.ownerId, {
    type: 'REQUEST_RECEIVED',
    title: 'New join request',
    body: `${request.sender.name} wants to join ${role.title} in ${role.team.name}`,
    link: '/dashboard',
    data: { requestId: request.id },
  });
  return toRequestDto(request, userId);
}

export async function sendInvite(ownerId, { teamId, roleId, userId, message }) {
  await assertOwner(teamId, ownerId);
  if (userId === ownerId) throw conflict('ALREADY_MEMBER', 'You are already on your own team');
  const profile = await prisma.memberProfile.findUnique({ where: { userId }, select: { isDiscoverable: true } });
  if (!profile?.isDiscoverable) throw notFound('Member');

  const role = await loadOpenRole(teamId, roleId, userId);
  await assertNoPending(roleId, userId, ownerId);
  const request = await createRequest({
    type: 'INVITE',
    teamId,
    roleId,
    senderId: ownerId,
    recipientId: userId,
    message,
    matchScore: await scoreFor(userId, roleId),
  });

  emitRequestChange(request);
  await notify(userId, {
    type: 'REQUEST_RECEIVED',
    title: 'New invite',
    body: `${request.sender.name} invited you to ${role.title} in ${role.team.name}`,
    link: '/dashboard',
    data: { requestId: request.id },
  });
  return toRequestDto(request, ownerId);
}

/** Pending requests for a role are cancelled once it is full. Returns what was cancelled. */
export async function cancelPendingForRole(tx, roleId, exceptRequestId) {
  const pending = await tx.request.findMany({
    where: { roleId, status: 'PENDING', ...(exceptRequestId && { id: { not: exceptRequestId } }) },
    select: { id: true, type: true, senderId: true, recipientId: true },
  });
  if (pending.length) {
    await tx.request.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    });
  }
  return pending;
}

/**
 * Accepting is the critical section. Locks are taken role first, then request, in every code path,
 * so two parallel accepts for the last slot serialise on the role row (one wins, the other gets
 * ROLE_FULL) and cannot deadlock with the auto-cancel of the losers.
 */
export async function acceptRequest(requestId, actorId) {
  const outcome = await prisma.$transaction(async (tx) => {
    const peek = await tx.request.findUnique({ where: { id: requestId }, select: { roleId: true } });
    if (!peek) throw notFound('Request');

    await lockRole(tx, peek.roleId);
    await lockRequest(tx, requestId);

    const request = await tx.request.findUniqueOrThrow({ where: { id: requestId }, include: requestInclude });
    if (request.recipientId !== actorId) throw forbidden('Only the recipient can accept this');
    if (request.status !== 'PENDING') throw conflict('NOT_PENDING', 'This request has already been handled');

    const role = await tx.role.findUniqueOrThrow({
      where: { id: request.roleId },
      include: { team: { select: { id: true, name: true, ownerId: true, status: true } } },
    });
    if (role.team.status === 'ARCHIVED') throw conflict('TEAM_ARCHIVED', 'This team is archived');
    if (role.team.status === 'CLOSED' || role.filled >= role.slots)
      throw conflict('ROLE_FULL', 'This role is already filled');

    const memberId = request.type === 'INVITE' ? request.recipientId : request.senderId;
    if (await tx.teamMember.findUnique({ where: { teamId_userId: { teamId: role.teamId, userId: memberId } } })) {
      throw conflict('ALREADY_MEMBER', 'Already a member of this team');
    }

    await tx.teamMember.create({ data: { teamId: role.teamId, userId: memberId, roleId: role.id } });
    const updatedRole = await tx.role.update({ where: { id: role.id }, data: { filled: { increment: 1 } } });
    const accepted = await tx.request.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
      include: requestInclude,
    });
    const roleNowFull = updatedRole.filled >= updatedRole.slots;
    const cancelled = roleNowFull ? await cancelPendingForRole(tx, role.id, requestId) : [];
    const teamStatus = await recomputeTeamStatus(tx, role.teamId);
    return { accepted, team: role.team, role: updatedRole, roleNowFull, cancelled, teamStatus };
  });

  const { accepted, team, role, roleNowFull, cancelled, teamStatus } = outcome;
  emitRequestChange(accepted);
  await publishTeamChange(team.id, team.ownerId);
  await notify(accepted.senderId, {
    type: 'REQUEST_ACCEPTED',
    title: `${typeWord(accepted.type) === 'invite' ? 'Invite' : 'Request'} accepted`,
    body: `${accepted.recipient.name} accepted your ${typeWord(accepted.type)} for ${role.title} in ${team.name}`,
    link: `/teams/${team.id}`,
    data: { requestId: accepted.id, teamId: team.id },
  });
  if (roleNowFull) await notifyRoleFilled(team, role);
  await notifyCancelledRequests(cancelled, team, role);
  if (teamStatus.previous !== 'CLOSED' && teamStatus.current === 'CLOSED') await notifyTeamClosed(team);
  return toRequestDto(accepted, actorId);
}

/** Moves a PENDING request to a final state atomically; a lost race surfaces as NOT_PENDING. */
async function finishPending(requestId, actorId, party, status) {
  const request = await prisma.request.findUnique({ where: { id: requestId }, include: requestInclude });
  if (!request) throw notFound('Request');
  if (request[party] !== actorId)
    throw forbidden(party === 'recipientId' ? 'Only the recipient can do that' : 'Only the sender can do that');
  const { count } = await prisma.request.updateMany({
    where: { id: requestId, status: 'PENDING' },
    data: { status, respondedAt: new Date() },
  });
  if (count === 0) throw conflict('NOT_PENDING', 'This request has already been handled');
  return { ...request, status };
}

export async function declineRequest(requestId, actorId) {
  const request = await finishPending(requestId, actorId, 'recipientId', 'DECLINED');
  emitRequestChange(request);
  await notify(request.senderId, {
    type: 'REQUEST_DECLINED',
    title: `${typeWord(request.type) === 'invite' ? 'Invite' : 'Request'} declined`,
    body: `${request.recipient.name} declined your ${typeWord(request.type)} for ${request.role.title} in ${request.team.name}`,
    link: '/dashboard',
    data: { requestId: request.id },
  });
  return toRequestDto(request, actorId);
}

export async function cancelRequest(requestId, actorId) {
  const request = await finishPending(requestId, actorId, 'senderId', 'CANCELLED');
  emitRequestChange(request);
  await notify(request.recipientId, {
    type: 'REQUEST_CANCELLED',
    title: `${typeWord(request.type) === 'invite' ? 'Invite' : 'Request'} cancelled`,
    body: `${request.sender.name} cancelled their ${typeWord(request.type)} for ${request.role.title} in ${request.team.name}`,
    link: '/dashboard',
    data: { requestId: request.id },
  });
  return toRequestDto(request, actorId);
}

export async function listRequests(userId, { box, status, teamId, page, pageSize }) {
  const party = {
    received: [{ recipientId: userId }],
    sent: [{ senderId: userId }],
    all: [{ senderId: userId }, { recipientId: userId }],
  }[box];
  const where = { OR: party, ...(status.length && { status: { in: status } }), ...(teamId && { teamId }) };
  const [items, total] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: requestInclude,
    }),
    prisma.request.count({ where }),
  ]);
  return buildPage(
    items.map((r) => toRequestDto(r, userId)),
    page,
    pageSize,
    total,
  );
}
