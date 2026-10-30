import { prisma } from '../../lib/prisma.js';
import { listRequests } from '../requests/requests.service.js';
import { recommendMembers, recommendTeams } from '../match/match.service.js';
import { decorateTeamDtos } from '../teams/team-decorator.js';
import { teamInclude } from '../teams/teams.dto.js';
import { toTeamDtos } from '../teams/teams.service.js';
import { unreadCount } from '../notifications/notifications.service.js';

export async function summary(userId) {
  const [pendingReceived, pendingSent, ownedTeams, joinedTeams, unread, openRolesTotal] = await Promise.all([
    prisma.request.count({ where: { recipientId: userId, status: 'PENDING' } }),
    prisma.request.count({ where: { senderId: userId, status: 'PENDING' } }),
    prisma.team.count({ where: { ownerId: userId } }),
    prisma.teamMember.count({ where: { userId, isOwner: false } }),
    unreadCount(userId),
    prisma.role.count({
      where: { filled: { lt: prisma.role.fields.slots }, team: { ownerId: userId, status: 'OPEN' } },
    }),
  ]);
  return { pendingReceived, pendingSent, ownedTeams, joinedTeams, unreadNotifications: unread, openRolesTotal };
}

/** Per owned team: roles, incoming pending requests and the best candidates for its first open role. */
export async function ownerView(userId) {
  const teams = await prisma.team.findMany({
    where: { ownerId: userId, status: { not: 'ARCHIVED' } },
    orderBy: { createdAt: 'desc' },
    include: teamInclude,
  });
  const dtos = await toTeamDtos(teams, userId);
  return Promise.all(
    dtos.map(async (team) => {
      const pending = await listRequests(userId, {
        box: 'received',
        status: ['PENDING'],
        teamId: team.id,
        page: 1,
        pageSize: 50,
      });
      const openRole = team.roles.find((r) => r.open > 0);
      const people =
        openRole && team.status === 'OPEN' ? (await recommendMembers(userId, openRole.id)).slice(0, 3) : [];
      return {
        team,
        roles: team.roles,
        pendingRequests: pending.items,
        recommendedPeople: people,
        recommendedForRole: openRole ? { id: openRole.id, title: openRole.title } : null,
      };
    }),
  );
}

export async function memberView(userId) {
  const [received, sent, picks] = await Promise.all([
    listRequests(userId, { box: 'received', status: ['PENDING'], page: 1, pageSize: 50 }),
    listRequests(userId, { box: 'sent', status: ['PENDING'], page: 1, pageSize: 50 }),
    recommendTeams(userId),
  ]);
  const top = picks.slice(0, 3);
  const decorated = await decorateTeamDtos(
    top.map((p) => p.team),
    userId,
  );
  return {
    pendingReceived: received.items,
    pendingSent: sent.items,
    recommendations: top.map((p, i) => ({ team: decorated[i], role: p.role, match: p.match })),
  };
}
