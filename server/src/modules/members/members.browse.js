import { prisma } from '../../lib/prisma.js';
import { buildPage, MATCH_SORT_CAP, slicePage } from '../../lib/pagination.js';
import { cachedSearch } from '../../lib/search-cache.js';
import { loadOwnedRole, scoreRole } from '../match/match.service.js';
import { memberInclude, toMemberDto } from './members.dto.js';

function buildWhere(viewerId, f) {
  const where = {
    isDiscoverable: true,
    userId: { not: viewerId },
    ...(f.level.length && { experienceLevel: { in: f.level } }),
    ...(f.minHours && { availabilityHrs: { gte: f.minHours } }),
    ...(f.lookingFor.length && { lookingFor: { hasSome: f.lookingFor } }),
    ...(f.q && {
      OR: [
        { user: { name: { contains: f.q, mode: 'insensitive' } } },
        { headline: { contains: f.q, mode: 'insensitive' } },
      ],
    }),
  };
  if (f.skills.length) {
    where.AND =
      f.skillMode === 'all'
        ? f.skills.map((id) => ({ skills: { some: { skillId: id } } }))
        : [{ skills: { some: { skillId: { in: f.skills } } } }];
  }
  return where;
}

const orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];

/** Browse people. Shared lists are cached per viewer and filters; match scores are added afterwards. */
export async function browseMembers(viewerId, filters) {
  const { page, pageSize, roleId } = filters;
  const role = roleId ? await loadOwnedRole(viewerId, roleId) : null;
  const rankByMatch = Boolean(role) && filters.sort === 'match';
  const where = buildWhere(viewerId, filters);

  const { sort: _sort, page: _page, pageSize: _pageSize, roleId: _roleId, ...searchFilters } = filters;
  const loader = async () => {
    if (rankByMatch) {
      const [profiles, total] = await Promise.all([
        prisma.memberProfile.findMany({ where, orderBy, take: MATCH_SORT_CAP, include: memberInclude }),
        prisma.memberProfile.count({ where }),
      ]);
      return { items: profiles.map(toMemberDto), total: Math.min(total, MATCH_SORT_CAP) };
    }
    const [profiles, total] = await Promise.all([
      prisma.memberProfile.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: memberInclude,
      }),
      prisma.memberProfile.count({ where }),
    ]);
    return { items: profiles.map(toMemberDto), total };
  };
  const shared = await cachedSearch(
    'people',
    { viewerId, ...searchFilters, ...(rankByMatch ? { all: true } : { page, pageSize }) },
    60,
    loader,
  );

  const withMatch = (items) =>
    role ? items.map((m) => ({ ...m, match: scoreRole(role.dto, role.teamType, m) })) : items;
  if (!rankByMatch) return buildPage(withMatch(shared.items), page, pageSize, shared.total);

  const ranked = withMatch(shared.items).sort((a, b) => b.match.score - a.match.score || a.name.localeCompare(b.name));
  return slicePage(ranked, page, pageSize);
}
