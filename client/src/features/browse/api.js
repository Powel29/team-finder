import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api.js';

export const PAGE_SIZE = 12;

const peopleQuery = (p) => ({
  q: p.q,
  skills: p.skills,
  skillMode: p.skills.length > 1 ? p.skillMode : undefined,
  level: p.level,
  minHours: p.minHours,
  lookingFor: p.lookingFor,
  roleId: p.roleId,
  sort: p.roleId && p.sort !== 'recent' ? 'match' : 'recent',
  page: p.page,
  pageSize: PAGE_SIZE,
});

const teamsQuery = (p) => ({
  q: p.q,
  stack: p.stack,
  roleSkill: p.roleSkill,
  type: p.type,
  deadlineBefore: p.deadlineBefore ? `${p.deadlineBefore}T23:59:59.999Z` : undefined,
  sort: p.sort || 'recent',
  page: p.page,
  pageSize: PAGE_SIZE,
});

export const useMembers = (params) => {
  const query = peopleQuery(params);
  return useQuery({
    queryKey: ['members', query],
    queryFn: () => api(`/api/members${toQuery(query)}`),
    placeholderData: keepPreviousData,
  });
};

export const useTeams = (params) => {
  const query = teamsQuery(params);
  return useQuery({
    queryKey: ['teams', query],
    queryFn: () => api(`/api/teams${toQuery(query)}`),
    placeholderData: keepPreviousData,
  });
};
