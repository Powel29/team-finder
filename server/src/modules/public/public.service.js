import { prisma } from '../../lib/prisma.js';
import { cache } from '../../lib/cache.js';

/** Up to six open teams with no private data, for the landing page. */
export async function featuredTeams() {
  const version = await cache.version('teams');
  return cache.getOrSet(`public:featured:v${version}`, 60, async () => {
    const teams = await prisma.team.findMany({
      where: { status: 'OPEN', roles: { some: { filled: { lt: prisma.role.fields.slots } } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 6,
      include: {
        tech: { include: { skill: { select: { id: true, name: true } } } },
        roles: { select: { slots: true, filled: true } },
      },
    });
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      techStack: t.tech.map((x) => ({ id: x.skill.id, name: x.skill.name })),
      openSlots: t.roles.reduce((sum, r) => sum + Math.max(0, r.slots - r.filled), 0),
    }));
  });
}

export async function stats() {
  const version = await cache.version('teams');
  return cache.getOrSet(`public:stats:v${version}`, 60, async () => {
    const [members, openTeams, openRoles] = await Promise.all([
      prisma.memberProfile.count({ where: { isDiscoverable: true } }),
      prisma.team.count({ where: { status: 'OPEN' } }),
      prisma.role.count({ where: { filled: { lt: prisma.role.fields.slots }, team: { status: 'OPEN' } } }),
    ]);
    return { members, openTeams, openRoles };
  });
}
