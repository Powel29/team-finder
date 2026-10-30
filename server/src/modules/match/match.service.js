import { prisma } from '../../lib/prisma.js';
import { cache } from '../../lib/cache.js';
import { computeMatch } from '../../lib/match.js';
import { normalizeSkill } from '../../lib/skills.js';
import { AppError, forbidden, notFound } from '../../lib/errors.js';
import { memberInclude, toMemberDto } from '../members/members.dto.js';
import { teamInclude, toRoleDto, toTeamDto } from '../teams/teams.dto.js';

const MIN_RECOMMENDED_SCORE = 40;
const CANDIDATE_CAP = 300;
const TOP = 10;

const roleInclude = {
  skills: { include: { skill: { select: { id: true, name: true, slug: true } } } },
  team: { select: { id: true, type: true, ownerId: true } },
};

/**
 * Scores a role DTO against a member DTO and reports skills by display name.
 * @param {ReturnType<typeof toRoleDto>} role
 * @param {string} teamType
 * @param {ReturnType<typeof toMemberDto>} member
 */
export function scoreRole(role, teamType, member) {
  const names = new Map();
  for (const s of [...member.skills, ...role.requiredSkills, ...role.niceToHaveSkills])
    names.set(normalizeSkill(s.name), s.name);

  const result = computeMatch(
    {
      requiredSkills: role.requiredSkills.map((s) => s.name),
      niceToHaveSkills: role.niceToHaveSkills.map((s) => s.name),
      minLevel: role.minLevel,
      minHoursPerWeek: role.minHoursPerWeek,
      teamType,
    },
    {
      skills: member.skills.map((s) => s.name),
      experienceLevel: member.experienceLevel,
      availabilityHrs: member.availabilityHrs,
      lookingFor: member.lookingFor,
    },
  );
  const label = (slug) => names.get(slug) ?? slug;
  return {
    ...result,
    matchedSkills: result.matchedSkills.map(label),
    missingSkills: result.missingSkills.map(label),
    missingNiceToHave: result.missingNiceToHave.map(label),
  };
}

/** Member DTO for a user id, or null when they have no profile. */
export async function loadMember(userId) {
  const profile = await prisma.memberProfile.findUnique({ where: { userId }, include: memberInclude });
  return profile ? toMemberDto(profile) : null;
}

/** Cached score for one member and role. Cache keys carry a version that is bumped on profile or role writes. */
export async function getMatch(userId, roleId) {
  const version = await cache.version('match');
  return cache.getOrSet(`match:v${version}:${userId}:${roleId}`, 600, async () => {
    const [member, role] = await Promise.all([
      loadMember(userId),
      prisma.role.findUnique({ where: { id: roleId }, include: roleInclude }),
    ]);
    if (!role) throw notFound('Role');
    if (!member) throw new AppError(400, 'PROFILE_REQUIRED', 'This member has not created a profile yet');
    return scoreRole(toRoleDto(role), role.team.type, member);
  });
}

/** GET /match: the requester must own the role's team or be asking about themselves. */
export async function getMatchForRequester(requesterId, { roleId, userId }) {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { team: { select: { ownerId: true } } } });
  if (!role) throw notFound('Role');
  const targetId = userId ?? requesterId;
  if (targetId !== requesterId && role.team.ownerId !== requesterId)
    throw forbidden('You can only see matches for your own teams');
  return getMatch(targetId, roleId);
}

/** Loads a role the requester owns, as a DTO with its team type. */
export async function loadOwnedRole(ownerId, roleId, db = prisma) {
  const role = await db.role.findUnique({ where: { id: roleId }, include: roleInclude });
  if (!role) throw notFound('Role');
  if (role.team.ownerId !== ownerId) throw forbidden('You can only use roles of your own teams');
  return { raw: role, dto: toRoleDto(role), teamType: role.team.type };
}

/** Top people for a role: SQL pre-filter, then in-memory scoring. */
export async function recommendMembers(
  ownerId,
  roleId,
  { minScore = MIN_RECOMMENDED_SCORE, limit = TOP, cap = CANDIDATE_CAP } = {},
  db = prisma,
) {
  const { raw, dto, teamType } = await loadOwnedRole(ownerId, roleId, db);

  const memberFilter = {
    isDiscoverable: true,
    ...(raw.minHoursPerWeek && { availabilityHrs: { gte: raw.minHoursPerWeek } }),
    user: {
      memberships: { none: { teamId: raw.teamId } },
      sentRequests: { none: { roleId, status: 'PENDING' } },
      receivedReqs: { none: { roleId, status: 'PENDING' } },
    },
  };
  const requiredIds = dto.requiredSkills.map((s) => s.id);

  let profileIds;
  if (requiredIds.length > 0) {
    const grouped = await db.memberSkill.groupBy({
      by: ['memberProfileId'],
      where: { skillId: { in: requiredIds }, memberProfile: memberFilter },
      _count: { skillId: true },
      orderBy: { _count: { skillId: 'desc' } },
      take: cap,
    });
    profileIds = grouped.map((g) => g.memberProfileId);
  } else {
    profileIds = (await db.memberProfile.findMany({ where: memberFilter, select: { id: true }, take: cap })).map(
      (p) => p.id,
    );
  }

  const profiles = await db.memberProfile.findMany({ where: { id: { in: profileIds } }, include: memberInclude });
  return profiles
    .map(toMemberDto)
    .map((member) => ({ ...member, match: scoreRole(dto, teamType, member) }))
    .filter((m) => m.match.score >= minScore)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

/** Best open role per team for a member, top 10 by score. */
export async function recommendTeams(userId, db = prisma) {
  const member = await loadMember(userId);
  if (!member) return [];
  const teams = await db.team.findMany({
    where: {
      status: 'OPEN',
      ownerId: { not: userId },
      members: { none: { userId } },
      roles: { some: { filled: { lt: db.role.fields.slots } } },
    },
    orderBy: { createdAt: 'desc' },
    take: CANDIDATE_CAP,
    include: teamInclude,
  });

  const picks = [];
  for (const team of teams) {
    const dto = toTeamDto(team);
    const best = dto.roles
      .filter((r) => r.open > 0)
      .map((role) => ({ role, match: scoreRole(role, dto.type, member) }))
      .sort((a, b) => b.match.score - a.match.score)[0];
    if (best && best.match.score >= MIN_RECOMMENDED_SCORE) picks.push({ team: dto, ...best });
  }
  return picks.sort((a, b) => b.match.score - a.match.score).slice(0, TOP);
}
