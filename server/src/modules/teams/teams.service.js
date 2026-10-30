import { prisma } from '../../lib/prisma.js';
import { AppError, conflict, notFound } from '../../lib/errors.js';
import { resolveSkillIds } from '../skills/skills.service.js';
import { removeUserFromTeamRoom } from '../../lib/socket.js';
import { notifyMany } from '../notifications/notifications.service.js';
import { assertOwner } from './team-guards.js';
import { recomputeTeamStatus } from './team-status.js';
import { publishTeamChange } from './team-events.js';
import { scheduleRoleScan, scheduleTeamScan } from '../match/match-notifier.js';
import { decorateTeamDtos } from './team-decorator.js';
import { teamInclude, toTeamDto } from './teams.dto.js';

/** Required skills win when a skill is listed as both required and nice-to-have. */
const roleSkillRows = (required, nice) => [
  ...required.map((skillId) => ({ skillId, importance: 'REQUIRED' })),
  ...nice.filter((s) => !required.includes(s)).map((skillId) => ({ skillId, importance: 'NICE_TO_HAVE' })),
];

async function resolveRoleSkills(input) {
  const [required, nice] = await Promise.all([
    resolveSkillIds({ skillIds: input.requiredSkillIds, skillNames: input.requiredSkillNames }),
    resolveSkillIds({ skillIds: input.niceToHaveSkillIds, skillNames: input.niceToHaveSkillNames }),
  ]);
  return roleSkillRows(required, nice);
}

const touchesSkills = (input, ...keys) => keys.some((k) => input[k] !== undefined);

export async function loadTeam(teamId, db = prisma) {
  const team = await db.team.findUnique({ where: { id: teamId }, include: teamInclude });
  if (!team) throw notFound('Team');
  return team;
}

/** Shapes teams for a viewer: neutral DTOs plus one batched decoration pass (no per-team queries). */
export const toTeamDtos = (teams, viewerId) => decorateTeamDtos(teams.map(toTeamDto), viewerId);

export async function getTeam(teamId, viewerId) {
  const [dto] = await toTeamDtos([await loadTeam(teamId)], viewerId);
  return dto;
}

export async function createTeam(userId, input) {
  const techIds = await resolveSkillIds({ skillIds: input.techStackIds, skillNames: input.techStackNames });
  const roles = await Promise.all(input.roles.map(async (r) => ({ ...r, skills: await resolveRoleSkills(r) })));

  const teamId = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        ownerId: userId,
        name: input.name,
        idea: input.idea,
        type: input.type,
        teamSize: input.teamSize,
        deadline: input.deadline ?? null,
        tech: { create: techIds.map((skillId) => ({ skillId })) },
        members: { create: { userId, isOwner: true } },
      },
    });
    for (const r of roles) {
      await tx.role.create({
        data: {
          teamId: team.id,
          title: r.title,
          slots: r.slots,
          minLevel: r.minLevel ?? null,
          minHoursPerWeek: r.minHoursPerWeek ?? null,
          skills: { create: r.skills },
        },
      });
    }
    return team.id;
  });

  await publishTeamChange(teamId, userId);
  scheduleTeamScan(teamId);
  return getTeam(teamId, userId);
}

export async function updateTeam(teamId, userId, input) {
  await assertOwner(teamId, userId);
  const { techStackIds, techStackNames, status, ...fields } = input;
  const techIds = touchesSkills(input, 'techStackIds', 'techStackNames')
    ? await resolveSkillIds({ skillIds: techStackIds, skillNames: techStackNames })
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { ...fields, ...(status && { status }) } });
    if (techIds) {
      await tx.teamTech.deleteMany({ where: { teamId } });
      await tx.teamTech.createMany({ data: techIds.map((skillId) => ({ teamId, skillId })) });
    }
    if (status === 'OPEN') await recomputeTeamStatus(tx, teamId);
  });

  await publishTeamChange(teamId, userId);
  return getTeam(teamId, userId);
}

export async function listMyTeams(userId) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
    include: { team: { include: teamInclude } },
  });
  const dtos = await toTeamDtos(
    memberships.map((m) => m.team),
    userId,
  );
  return {
    owned: dtos.filter((_, i) => memberships[i].isOwner),
    joined: dtos.filter((_, i) => !memberships[i].isOwner),
  };
}

export async function addRole(teamId, userId, input) {
  await assertOwner(teamId, userId);
  const skills = await resolveRoleSkills(input);
  const roleId = await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        teamId,
        title: input.title,
        slots: input.slots,
        minLevel: input.minLevel ?? null,
        minHoursPerWeek: input.minHoursPerWeek ?? null,
        skills: { create: skills },
      },
    });
    await recomputeTeamStatus(tx, teamId);
    return role.id;
  });
  await publishTeamChange(teamId, userId);
  scheduleRoleScan(roleId);
  return getTeam(teamId, userId);
}

async function loadRole(db, teamId, roleId) {
  const role = await db.role.findFirst({ where: { id: roleId, teamId } });
  if (!role) throw notFound('Role');
  return role;
}

export async function updateRole(teamId, roleId, userId, input) {
  await assertOwner(teamId, userId);
  const existing = await loadRole(prisma, teamId, roleId);
  if (input.slots !== undefined && input.slots < existing.filled) {
    throw conflict('SLOTS_BELOW_FILLED', `Slots cannot be lower than the ${existing.filled} already filled`);
  }
  const keys = ['requiredSkillIds', 'requiredSkillNames', 'niceToHaveSkillIds', 'niceToHaveSkillNames'];
  const skills = touchesSkills(input, ...keys) ? await resolveRoleSkills(input) : null;

  await prisma.$transaction(async (tx) => {
    const { title, slots, minLevel, minHoursPerWeek } = input;
    await tx.role.update({ where: { id: roleId }, data: { title, slots, minLevel, minHoursPerWeek } });
    if (skills) {
      await tx.roleSkill.deleteMany({ where: { roleId } });
      await tx.roleSkill.createMany({ data: skills.map((s) => ({ ...s, roleId })) });
    }
    await recomputeTeamStatus(tx, teamId);
  });
  await publishTeamChange(teamId, userId);
  scheduleRoleScan(roleId);
  return getTeam(teamId, userId);
}

export async function deleteRole(teamId, roleId, userId) {
  await assertOwner(teamId, userId);
  const role = await loadRole(prisma, teamId, roleId);
  const [roleCount, assigned, pending] = await Promise.all([
    prisma.role.count({ where: { teamId } }),
    prisma.teamMember.count({ where: { roleId } }),
    prisma.request.count({ where: { roleId, status: 'PENDING' } }),
  ]);
  if (role.filled > 0 || assigned > 0)
    throw conflict('ROLE_HAS_MEMBERS', 'Remove the members of this role before deleting it');
  if (pending > 0) throw conflict('ROLE_HAS_MEMBERS', 'Resolve the pending requests for this role before deleting it');
  if (roleCount <= 1) throw new AppError(400, 'VALIDATION_ERROR', 'A team needs at least one role');

  await prisma.$transaction(async (tx) => {
    await tx.role.delete({ where: { id: roleId } });
    await recomputeTeamStatus(tx, teamId);
  });
  await publishTeamChange(teamId, userId);
  return getTeam(teamId, userId);
}

export async function deleteTeam(teamId, userId) {
  const team = await assertOwner(teamId, userId);
  const members = await prisma.teamMember.findMany({ where: { teamId, isOwner: false }, select: { userId: true } });
  await prisma.team.delete({ where: { id: team.id } });
  members.forEach((m) => removeUserFromTeamRoom(m.userId, teamId));
  await notifyMany(
    members.map((m) => m.userId),
    {
      type: 'TEAM_CLOSED',
      title: 'Team deleted',
      body: `${team.name} was deleted by its owner`,
      link: '/teams',
      data: { teamId },
    },
  );
  await publishTeamChange(teamId, userId);
}
