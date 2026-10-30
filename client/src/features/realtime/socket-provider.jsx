import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { api, apiUrl } from '@/lib/api.js';

const SocketContext = createContext({ socket: null, connected: false });
const MAX_AUTH_RETRIES = 3;

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

/**
 * One Socket.io connection for the signed-in area. Every (re)connect fetches a fresh 60 s socket
 * token, so expiry never breaks reconnects, and server events map onto React Query invalidations.
 */
export function SocketProvider({ children }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  const [connected, setConnected] = useState(false);
  const [socket] = useState(() =>
    io(apiUrl(''), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: (cb) =>
        api('/api/auth/socket-token')
          .then(({ token }) => cb({ token }))
          .catch(() => cb({ token: '' })),
    }),
  );

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let authRetries = 0;
    const invalidate = (...keys) => keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));

    socket.on('connect', () => {
      authRetries = 0;
      setConnected(true);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      if (err.message === 'UNAUTHENTICATED' && authRetries < MAX_AUTH_RETRIES) {
        authRetries += 1;
        setTimeout(() => socket.connect(), 500 * authRetries);
      }
    });

    socket.on('notification:new', ({ unreadCount, ...notification }) => {
      qc.setQueryData(['unread'], { count: unreadCount });
      invalidate(['notifications']);
      toast(notification.title, {
        description: notification.body,
        action: notification.link ? { label: 'View', onClick: () => navigate(notification.link) } : undefined,
      });
    });
    socket.on('chat:unread', ({ teamId }) => {
      if (pathRef.current === `/teams/${teamId}/chat`) return;
      qc.setQueryData(['chatUnread'], (prev) => ({ ...prev, [teamId]: (prev?.[teamId] ?? 0) + 1 }));
    });
    socket.on('requests:changed', () => invalidate(['requests'], ['dashboard'], ['team'], ['myTeams']));
    socket.on('team:changed', ({ teamId }) => invalidate(['team', teamId], ['teams'], ['myTeams'], ['dashboard']));

    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket, qc, navigate]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}
