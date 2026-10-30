/**
 * Keeps `Team.status` consistent with its roles: CLOSED exactly when at least one role exists and
 * every role is filled. ARCHIVED is a manual state and is never changed automatically.
 * @returns {Promise<{ previous: string, current: string }>}
 */
export async function recomputeTeamStatus(tx, teamId) {
  const team = await tx.team.findUniqueOrThrow({ where: { id: teamId }, select: { status: true } });
  if (team.status === 'ARCHIVED') return { previous: team.status, current: team.status };

  const roles = await tx.role.findMany({ where: { teamId }, select: { slots: true, filled: true } });
  const allFilled = roles.length > 0 && roles.every((r) => r.filled >= r.slots);
  const current = allFilled ? 'CLOSED' : 'OPEN';
  if (current !== team.status) await tx.team.update({ where: { id: teamId }, data: { status: current } });
  return { previous: team.status, current };
}
