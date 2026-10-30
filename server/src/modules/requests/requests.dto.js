export const requestInclude = {
  team: { select: { id: true, name: true } },
  role: { select: { id: true, title: true } },
  sender: { select: { id: true, name: true } },
  recipient: { select: { id: true, name: true } },
};

export const toRequestDto = (r, viewerId) => ({
  id: r.id,
  type: r.type,
  status: r.status,
  message: r.message,
  matchScore: r.matchScore,
  createdAt: r.createdAt,
  respondedAt: r.respondedAt,
  team: r.team,
  role: r.role,
  sender: r.sender,
  recipient: r.recipient,
  direction: r.senderId === viewerId ? 'SENT' : 'RECEIVED',
});
