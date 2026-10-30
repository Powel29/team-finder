let io = null;

export const setIo = (instance) => {
  io = instance;
};
export const getIo = () => io;

// Emitters are no-ops when no socket server is attached (e.g. in REST-only tests).
export const emitToUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
export const emitToTeam = (teamId, event, payload) => io?.to(`team:${teamId}`).emit(event, payload);

export const removeUserFromTeamRoom = (userId, teamId) => io?.in(`user:${userId}`).socketsLeave(`team:${teamId}`);
