import { prisma } from '../../lib/prisma.js';
import { buildPage, MATCH_SORT_CAP, slicePage } from '../../lib/pagination.js';
import { cachedSearch } from '../../lib/search-cache.js';
import { decorateTeamDtos } from './team-decorator.js';
import { teamInclude, toTeamDto } from './teams.dto.js';

const openRole = { filled: { lt: prisma.role.fields.slots } };

function buildWhere(f) {
  const and = [];
  if (!f.includeClosed) and.push({ roles: { some: openRole } });
  if (f.roleSkill.length)
    and.push({ roles: { some: { ...openRole, skills: { some: { skillId: { in: f.roleSkill } } } } } });
  if (f.stack.length) and.push({ tech: { some: { skillId: { in: f.stack } } } });
  if (f.q)
    and.push({
      OR: [{ name: { contains: f.q, mode: 'insensitive' } }, { idea: { contains: f.q, mode: 'insensitive' } }],
    });
  return {
    status: f.includeClosed ? { in: ['OPEN', 'CLOSED'] } : 'OPEN',
    ...(f.type.length && { type: { in: f.type } }),
    ...(f.deadlineBefore && { deadline: { lte: f.deadlineBefore } }),
    ...(and.length && { AND: and }),
  };
}

const ORDER = {
  recent: [{ createdAt: 'desc' }, { id: 'asc' }],
  deadline: [{ deadline: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
};

/** Highest match among the roles that can still take someone (any role for closed teams). */
const bestMatch = (team) => {
  const pool = team.roles.filter((r) => r.match && (r.open > 0 || team.status !== 'OPEN'));
  const best = pool.sort((a, b) => b.match.score - a.match.score)[0];
  return best ? { score: best.match.score, roleId: best.id, roleTitle: best.title } : null;
};

/** Browse teams. The neutral list is cached; the viewer's relation, requests and match are applied after. */
export async function browseTeams(viewerId, filters) {
  const { page, pageSize } = filters;
  const where = buildWhere(filters);
  const rankByMatch = filters.sort === 'match';

  const { sort, page: _page, pageSize: _pageSize, ...searchFilters } = filters;
  const loader = async () => {
    if (rankByMatch) {
      const [teams, total] = await Promise.all([
        prisma.team.findMany({ where, orderBy: ORDER.recent, take: MATCH_SORT_CAP, include: teamInclude }),
        prisma.team.count({ where }),
      ]);
      return { items: teams.map(toTeamDto), total: Math.min(total, MATCH_SORT_CAP) };
    }
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        orderBy: ORDER[sort],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: teamInclude,
      }),
      prisma.team.count({ where }),
    ]);
    return { items: teams.map(toTeamDto), total };
  };
  const shared = await cachedSearch(
    'teams',
    { ...searchFilters, sort, ...(rankByMatch ? { all: true } : { page, pageSize }) },
    60,
    loader,
  );

  const decorated = (await decorateTeamDtos(shared.items, viewerId)).map((t) => ({ ...t, bestMatch: bestMatch(t) }));
  if (!rankByMatch) return buildPage(decorated, page, pageSize, shared.total);
  const ranked = decorated.sort(
    (a, b) => (b.bestMatch?.score ?? -1) - (a.bestMatch?.score ?? -1) || a.name.localeCompare(b.name),
  );
  return slicePage(ranked, page, pageSize);
}
