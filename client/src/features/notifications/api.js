import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api.js';

export const useUnreadCount = () =>
  useQuery({ queryKey: ['unread'], queryFn: () => api('/api/notifications/unread-count'), staleTime: 60_000 });

export const useLatestNotifications = (enabled) =>
  useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => api(`/api/notifications${toQuery({ pageSize: 8 })}`),
    enabled,
  });

export const useNotificationList = (unreadOnly) =>
  useInfiniteQuery({
    queryKey: ['notifications', 'list', unreadOnly],
    queryFn: ({ pageParam }) =>
      api(`/api/notifications${toQuery({ unread: unreadOnly ? 'true' : undefined, page: pageParam, pageSize: 15 })}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

/** Marks items read in every cached notification list immediately, then reconciles with the server. */
function markCached(qc, id) {
  const readAt = new Date().toISOString();
  const patch = (n) => (n.readAt || (id && n.id !== id) ? n : { ...n, readAt });
  qc.setQueriesData({ queryKey: ['notifications'] }, (data) => {
    if (!data) return data;
    if (data.pages) return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map(patch) })) };
    return data.items ? { ...data, items: data.items.map(patch) } : data;
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/api/notifications/${id}/read`, { method: 'POST' }),
    onMutate: (id) => {
      markCached(qc, id);
      qc.setQueryData(['unread'], (prev) => ({ count: Math.max(0, (prev?.count ?? 1) - 1) }));
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['unread'] }),
        qc.invalidateQueries({ queryKey: ['notifications'] }),
      ]),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/api/notifications/read-all', { method: 'POST' }),
    onMutate: () => {
      markCached(qc, null);
      qc.setQueryData(['unread'], { count: 0 });
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['unread'] }),
        qc.invalidateQueries({ queryKey: ['notifications'] }),
      ]),
  });
}
