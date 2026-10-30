import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const useFeaturedTeams = () =>
  useQuery({
    queryKey: ['public', 'featured'],
    queryFn: () => api('/api/public/featured-teams').then((r) => r.items),
    staleTime: 60_000,
  });
export const usePublicStats = () =>
  useQuery({ queryKey: ['public', 'stats'], queryFn: () => api('/api/public/stats'), staleTime: 60_000 });
