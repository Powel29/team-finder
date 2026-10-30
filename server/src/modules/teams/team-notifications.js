import { prisma } from '../../lib/prisma.js';
import { notify, notifyMany } from '../notifications/notifications.service.js';
import { emitToUser } from '../../lib/socket.js';

/** Tells the other party of each auto-cancelled request (the one who is not the team owner). */
export async function notifyCancelledRequests(cancelled, team, role) {
  await Promise.all(
    cancelled.map((r) => {
      const other = r.senderId === team.ownerId ? r.recipientId : r.senderId;
      emitToUser(r.senderId, 'requests:changed', { requestId: r.id, status: 'CANCELLED' });
      emitToUser(r.recipientId, 'requests:changed', { requestId: r.id, status: 'CANCELLED' });
      return notify(other, {
        type: 'REQUEST_CANCELLED',
        title: 'Request cancelled',
        body: `${role.title} in ${team.name} was filled, so your pending ${r.type === 'INVITE' ? 'invite' : 'request'} was cancelled`,
        link: `/teams/${team.id}`,
        data: { requestId: r.id },
      });
    }),
  );
}

export const notifyRoleFilled = (team, role) =>
  notify(team.ownerId, {
    type: 'ROLE_FILLED',
    title: 'Role filled',
    body: `${role.title} in ${team.name} is now filled`,
    link: `/teams/${team.id}/manage`,
    data: { teamId: team.id, roleId: role.id },
  });

/** The owner and every member hear that the listing closed. */
export async function notifyTeamClosed(team) {
  const members = await prisma.teamMember.findMany({ where: { teamId: team.id }, select: { userId: true } });
  await notifyMany(
    members.map((m) => m.userId),
    {
      type: 'TEAM_CLOSED',
      title: 'Team is full',
      body: `All roles in ${team.name} are filled. The listing is now closed.`,
      link: `/teams/${team.id}`,
      data: { teamId: team.id },
    },
  );
}
