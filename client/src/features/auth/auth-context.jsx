import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

const AuthContext = createContext(null);

async function fetchMe() {
  try {
    return await api('/api/auth/me');
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const startSession = useCallback(
    async (path, body) => {
      await api(path, { method: 'POST', body });
      await qc.invalidateQueries({ queryKey: ['me'] });
    },
    [qc],
  );

  const value = useMemo(
    () => ({
      user: data?.user ?? null,
      hasMemberProfile: data?.hasMemberProfile ?? false,
      ownedTeamCount: data?.ownedTeamCount ?? 0,
      unreadNotifications: data?.unreadNotifications ?? 0,
      isLoading: isPending,
      error,
      retry: refetch,
      login: (credentials) => startSession('/api/auth/login', credentials),
      register: (details) => startSession('/api/auth/register', details),
      logout: async () => {
        await api('/api/auth/logout', { method: 'POST' });
        qc.clear();
        qc.setQueryData(['me'], null);
      },
    }),
    [data, isPending, error, refetch, startSession, qc],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
