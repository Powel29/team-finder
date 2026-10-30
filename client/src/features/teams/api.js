import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const useTeam = (id) => useQuery({ queryKey: ['team', id], queryFn: () => api(`/api/teams/${id}`) });
export const useMyTeams = () => useQuery({ queryKey: ['myTeams'], queryFn: () => api('/api/teams/mine') });

/** Invalidate everything that can show team data after a change. */
export function useInvalidateTeams() {
  const qc = useQueryClient();
  return (teamId) =>
    Promise.all([
      teamId && qc.invalidateQueries({ queryKey: ['team', teamId] }),
      qc.invalidateQueries({ queryKey: ['myTeams'] }),
      qc.invalidateQueries({ queryKey: ['teams'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
      qc.invalidateQueries({ queryKey: ['me'] }),
    ]);
}

export function useCreateTeam() {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (payload) => api('/api/teams', { method: 'POST', body: payload }),
    onSuccess: (team) => invalidate(team.id),
  });
}
