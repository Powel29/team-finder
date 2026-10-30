import { prisma } from '../../lib/prisma.js';
import { AppError, conflict, notFound } from '../../lib/errors.js';
import { removeUserFromTeamRoom } from '../../lib/socket.js';
import { notify } from '../notifications/notifications.service.js';
import { cancelPendingForRole } from '../requests/requests.service.js';
import { assertOwner } from './team-guards.js';
import { lockRole } from './team-locks.js';
import { publishTeamChange } from './team-events.js';
import { notifyCancelledRequests, notifyTeamClosed } from './team-notifications.js';
import { recomputeTeamStatus } from './team-status.js';
import { getTeam } from './teams.service.js';

const becameClosed = ({ previous, current }) => previous !== 'CLOSED' && current === 'CLOSED';

async function loadRoleOf(tx, teamId, roleId) {
  const role = await tx.role.findFirst({ where: { id: roleId, teamId } });
  if (!role) throw notFound('Role');
  return role;
}

/** Owner marks a role filled even if the person joined outside the app. Pending requests for it are cancelled. */
export async function markRoleFilled(teamId, roleId, ownerId) {
  const team = await assertOwner(teamId, ownerId);
  const outcome = await prisma.$transaction(async (tx) => {
    await lockRole(tx, roleId);
    const current = await loadRoleOf(tx, teamId, roleId);
    const role = await tx.role.update({ where: { id: roleId }, data: { filled: current.slots } });
    const cancelled = await cancelPendingForRole(tx, roleId);
    return { role, cancelled, status: await recomputeTeamStatus(tx, teamId) };
  });

  await notifyCancelledRequests(outcome.cancelled, team, outcome.role);
  if (becameClosed(outcome.status)) await notifyTeamClosed(team);
  await publishTeamChange(teamId, ownerId);
  return getTeam(teamId, ownerId);
}

/** Resets `filled` to the number of people actually assigned, which lists the role (and team) again. */
export async function reopenRole(teamId, roleId, ownerId) {
  await assertOwner(teamId, ownerId);
  await prisma.$transaction(async (tx) => {
    await lockRole(tx, roleId);
    const role = await loadRoleOf(tx, teamId, roleId);
    const assigned = await tx.teamMember.count({ where: { roleId } });
    if (assigned >= role.slots) {
      throw conflict('ROLE_FULL', 'Every slot has a member. Remove a member or add a slot to reopen this role');
    }
    await tx.role.update({ where: { id: roleId }, data: { filled: assigned } });
    await recomputeTeamStatus(tx, teamId);
  });
  await publishTeamChange(teamId, ownerId);
  return getTeam(teamId, ownerId);
}

/** Deletes the membership and frees the slot. Shared by "remove member" and "leave team". */
async function dropMember(teamId, userId) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (!membership) throw notFound('Member');
    if (membership.isOwner) throw new AppError(400, 'VALIDATION_ERROR', 'The team owner cannot be removed or leave');
    if (membership.roleId) {
      await lockRole(tx, membership.roleId);
      await tx.role.updateMany({
        where: { id: membership.roleId, filled: { gt: 0 } },
        data: { filled: { decrement: 1 } },
      });
    }
    await tx.teamMember.delete({ where: { id: membership.id } });
    return { membership, status: await recomputeTeamStatus(tx, teamId) };
  });
}

export async function removeMember(teamId, userId, ownerId) {
  const team = await assertOwner(teamId, ownerId);
  await dropMember(teamId, userId);
  removeUserFromTeamRoom(userId, teamId);
  await notify(userId, {
    type: 'MEMBER_REMOVED',
    title: 'Removed from team',
    body: `You were removed from ${team.name}`,
    link: '/teams',
    data: { teamId },
  });
  await publishTeamChange(teamId, ownerId);
  return getTeam(teamId, ownerId);
}

export async function leaveTeam(teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw notFound('Team');
  await dropMember(teamId, userId);
  removeUserFromTeamRoom(userId, teamId);
  const leaver = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(team.ownerId, {
    type: 'MEMBER_REMOVED',
    title: 'A member left',
    body: `${leaver?.name ?? 'A member'} left ${team.name}`,
    link: `/teams/${teamId}/manage`,
    data: { teamId, userId },
  });
  await publishTeamChange(teamId, team.ownerId);
}
