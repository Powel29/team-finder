export const teamInclude = {
  owner: { select: { id: true, name: true } },
  tech: { include: { skill: { select: { id: true, name: true, slug: true } } } },
  roles: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { skills: { include: { skill: { select: { id: true, name: true, slug: true } } } } },
  },
  members: {
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    include: { user: { select: { id: true, name: true } }, role: { select: { title: true } } },
  },
};

const skillDto = (s) => ({ id: s.skill.id, name: s.skill.name });

export function toRoleDto(role) {
  return {
    id: role.id,
    title: role.title,
    slots: role.slots,
    filled: role.filled,
    open: Math.max(0, role.slots - role.filled),
    minLevel: role.minLevel,
    minHoursPerWeek: role.minHoursPerWeek,
    requiredSkills: role.skills.filter((s) => s.importance === 'REQUIRED').map(skillDto),
    niceToHaveSkills: role.skills.filter((s) => s.importance === 'NICE_TO_HAVE').map(skillDto),
  };
}

/**
 * Viewer-neutral team DTO (safe to cache and share). Names only, never emails.
 * `myRelation`, `myPendingRequests` and `roles[].match` are added per viewer by `decorateTeamDtos`.
 * @param {object} team a team loaded with `teamInclude`
 */
export function toTeamDto(team) {
  const roles = team.roles.map(toRoleDto);
  return {
    id: team.id,
    name: team.name,
    idea: team.idea,
    type: team.type,
    teamSize: team.teamSize,
    deadline: team.deadline,
    status: team.status,
    createdAt: team.createdAt,
    owner: team.owner,
    techStack: team.tech.map(skillDto),
    roles,
    members: team.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      roleTitle: m.role?.title ?? null,
      isOwner: m.isOwner,
    })),
    memberCount: team.members.length,
    openSlots: roles.reduce((sum, r) => sum + r.open, 0),
    myRelation: 'NONE',
    myPendingRequests: [],
  };
}
