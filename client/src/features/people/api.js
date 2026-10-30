import { useQuery } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api.js';

export const useMember = (userId, roleId) =>
  useQuery({
    queryKey: ['member', userId, roleId ?? null],
    queryFn: () => api(`/api/members/${userId}${toQuery({ roleId })}`),
  });
