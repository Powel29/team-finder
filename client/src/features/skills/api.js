import { useQuery } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api.js';

export const useSkillSearch = (q) =>
  useQuery({
    queryKey: ['skills', q],
    queryFn: () => api(`/api/skills${toQuery({ q })}`).then((r) => r.items),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

export const createSkill = (name) => api('/api/skills', { method: 'POST', body: { name } });
