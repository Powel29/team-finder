import { prisma } from '../../lib/prisma.js';
import { emitToTeam, emitToUser } from '../../lib/socket.js';
import { assertTeamMember } from '../teams/team-guards.js';

const senderSelect = { select: { id: true, name: true } };

const toMessageDto = (m, clientId) => ({
  id: m.id,
  teamId: m.teamId,
  body: m.body,
  createdAt: m.createdAt,
  sender: m.sender,
  ...(clientId && { clientId }),
});

/** Persists a message, broadcasts it to the team room and nudges the other members' unread badges. */
export async function sendMessage(teamId, userId, body, clientId) {
  await assertTeamMember(teamId, userId);
  const message = await prisma.message.create({
    data: { teamId, senderId: userId, body },
    include: { sender: senderSelect },
  });
  const dto = toMessageDto(message, clientId);
  emitToTeam(teamId, 'chat:message', dto);

  const members = await prisma.teamMember.findMany({
    where: { teamId, userId: { not: userId } },
    select: { userId: true },
  });
  members.forEach((m) => emitToUser(m.userId, 'chat:unread', { teamId }));
  return dto;
}

/** Newest-first page. `before` is the id of the oldest message the client already has. */
export async function getHistory(teamId, userId, { before, limit }) {
  await assertTeamMember(teamId, userId);
  const rows = await prisma.message.findMany({
    where: { teamId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(before && { cursor: { id: before }, skip: 1 }),
    include: { sender: senderSelect },
  });
  return { items: rows.slice(0, limit).map((m) => toMessageDto(m)), hasMore: rows.length > limit };
}
