import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export const useMyProfile = () =>
  useQuery({
    queryKey: ['member', 'me'],
    queryFn: async () => {
      try {
        return await api('/api/members/me');
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },
  });

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api('/api/members/me', { method: 'PUT', body: payload }),
    onSuccess: (profile) => {
      qc.setQueryData(['member', 'me'], profile);
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
