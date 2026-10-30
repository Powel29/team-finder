import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api.js';

export const useRequests = (box, status) =>
  useQuery({
    queryKey: ['requests', box, status],
    queryFn: () => api(`/api/requests${toQuery({ box, status, pageSize: 50 })}`),
  });

const STATUS_AFTER = { accept: 'ACCEPTED', decline: 'DECLINED', cancel: 'CANCELLED' };

/** Everything that can show request or team state afterwards. */
export function useRefreshAfterRequestChange() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ['requests', 'dashboard', 'team', 'myTeams', 'teams', 'me', 'notifications', 'unread'].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

/** accept | decline | cancel with an optimistic status change that rolls back on failure. */
export function useRequestAction(action) {
  const qc = useQueryClient();
  const refresh = useRefreshAfterRequestChange();
  return useMutation({
    mutationFn: (id) => api(`/api/requests/${id}/${action}`, { method: 'POST' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['requests'] });
      const snapshots = qc.getQueriesData({ queryKey: ['requests'] });
      qc.setQueriesData({ queryKey: ['requests'] }, (page) =>
        page?.items
          ? { ...page, items: page.items.map((r) => (r.id === id ? { ...r, status: STATUS_AFTER[action] } : r)) }
          : page,
      );
      return { snapshots };
    },
    onError: (_err, _id, ctx) => ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: refresh,
  });
}

export function useSendRequest(kind) {
  const refresh = useRefreshAfterRequestChange();
  return useMutation({
    mutationFn: (payload) => api(`/api/requests/${kind}`, { method: 'POST', body: payload }),
    onSuccess: refresh,
  });
}

export const useDashboardSummary = () =>
  useQuery({ queryKey: ['dashboard', 'summary'], queryFn: () => api('/api/dashboard/summary') });
export const useOwnerDashboard = (enabled) =>
  useQuery({ queryKey: ['dashboard', 'owner'], queryFn: () => api('/api/dashboard/owner'), enabled });
export const useMemberDashboard = (enabled) =>
  useQuery({ queryKey: ['dashboard', 'member'], queryFn: () => api('/api/dashboard/member'), enabled });
