import { prisma } from '../../lib/prisma.js';
import { forbidden, notFound } from '../../lib/errors.js';

/** Loads the team and ensures `userId` owns it. */
export async function assertOwner(teamId, userId, db = prisma) {
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) throw notFound('Team');
  if (team.ownerId !== userId) throw forbidden('Only the team owner can do that');
  return team;
}

export async function assertTeamMember(teamId, userId, db = prisma) {
  const membership = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!membership) {
    const exists = await db.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!exists) throw notFound('Team');
    throw forbidden('Only team members can do that');
  }
  return membership;
}
