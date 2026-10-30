import { prisma } from '../../lib/prisma.js';
import { cache } from '../../lib/cache.js';
import { notFound } from '../../lib/errors.js';
import { getMatch, loadOwnedRole } from '../match/match.service.js';
import { scheduleMemberScan } from '../match/match-notifier.js';
import { resolveSkillIds } from '../skills/skills.service.js';
import { memberInclude, toMemberDto } from './members.dto.js';

export async function getOwnProfile(userId) {
  const profile = await prisma.memberProfile.findUnique({ where: { userId }, include: memberInclude });
  if (!profile) throw notFound('Member profile');
  return toMemberDto(profile);
}

export async function upsertOwnProfile(userId, input) {
  const { name, skillIds, skillNames, ...data } = input;
  const resolvedSkillIds = await resolveSkillIds({ skillIds, skillNames });

  const profile = await prisma.$transaction(async (tx) => {
    if (name) await tx.user.update({ where: { id: userId }, data: { name } });
    const saved = await tx.memberProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    await tx.memberSkill.deleteMany({ where: { memberProfileId: saved.id } });
    await tx.memberSkill.createMany({
      data: resolvedSkillIds.map((skillId) => ({ memberProfileId: saved.id, skillId })),
    });
    return tx.memberProfile.findUniqueOrThrow({ where: { id: saved.id }, include: memberInclude });
  });

  await cache.bump('people', 'match');
  scheduleMemberScan(userId);
  return toMemberDto(profile);
}

/** Profiles are visible when discoverable, or when the viewer already has a relationship with the person. */
async function canViewProfile(viewerId, profile) {
  if (profile.userId === viewerId || profile.isDiscoverable) return true;
  const [request, sharedTeam] = await Promise.all([
    prisma.request.findFirst({
      where: {
        OR: [
          { senderId: viewerId, recipientId: profile.userId },
          { senderId: profile.userId, recipientId: viewerId },
        ],
      },
      select: { id: true },
    }),
    prisma.teamMember.findFirst({
      where: { userId: profile.userId, team: { members: { some: { userId: viewerId } } } },
      select: { id: true },
    }),
  ]);
  return Boolean(request || sharedTeam);
}

export async function getMember(viewerId, userId, roleId) {
  const profile = await prisma.memberProfile.findUnique({ where: { userId }, include: memberInclude });
  if (!profile || !(await canViewProfile(viewerId, profile))) throw notFound('Member');
  if (!roleId) return toMemberDto(profile);
  await loadOwnedRole(viewerId, roleId);
  return toMemberDto(profile, { match: await getMatch(userId, roleId) });
}
