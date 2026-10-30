import { cache } from '../../lib/cache.js';
import { emitToTeam, emitToUser } from '../../lib/socket.js';

/** Invalidates cached listings and tells connected clients that a team changed. */
export async function publishTeamChange(teamId, ownerId) {
  await cache.bump('teams', 'match');
  emitToTeam(teamId, 'team:changed', { teamId });
  emitToUser(ownerId, 'team:changed', { teamId });
}
