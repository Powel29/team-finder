import { prisma } from '../../lib/prisma.js';
import { loadMember, scoreRole } from '../match/match.service.js';

const pendingFor = (teamIds, viewerId) =>
  prisma.request.findMany({
    where: { teamId: { in: teamIds }, status: 'PENDING', OR: [{ senderId: viewerId }, { recipientId: viewerId }] },
    select: { id: true, teamId: true, roleId: true, type: true, senderId: true },
  });

/**
 * Adds everything that depends on who is looking: relation to the team, the viewer's pending
 * requests and a match score per role. Kept out of the shared, cached search results.
 * @param {object[]} dtos neutral team DTOs
 */
export async function decorateTeamDtos(dtos, viewerId) {
  if (dtos.length === 0) return dtos;
  const [member, pending] = await Promise.all([
    loadMember(viewerId),
    pendingFor(
      dtos.map((d) => d.id),
      viewerId,
    ),
  ]);

  return dtos.map((dto) => {
    const isOwner = dto.owner.id === viewerId;
    const isMember = dto.members.some((m) => m.userId === viewerId);
    return {
      ...dto,
      roles:
        member && !isOwner
          ? dto.roles.map((role) => ({ ...role, match: scoreRole(role, dto.type, member) }))
          : dto.roles,
      myRelation: isOwner ? 'OWNER' : isMember ? 'MEMBER' : 'NONE',
      myPendingRequests: isOwner
        ? []
        : pending
            .filter((r) => r.teamId === dto.id)
            .map((r) => ({
              requestId: r.id,
              roleId: r.roleId,
              type: r.type,
              direction: r.senderId === viewerId ? 'SENT' : 'RECEIVED',
            })),
    };
  });
}
