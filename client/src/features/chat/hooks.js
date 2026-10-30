import { useQuery } from '@tanstack/react-query';
import { useMyTeams } from '@/features/teams/api.js';

export const useChatUnread = () =>
  useQuery({ queryKey: ['chatUnread'], queryFn: () => ({}), staleTime: Infinity, gcTime: Infinity, initialData: {} })
    .data;

/** Chat rooms are the teams the user owns or has joined. */
export function useChatTeams() {
  const { data, isPending, error } = useMyTeams();
  return { teams: data ? [...data.owned, ...data.joined] : [], isPending, error };
}
