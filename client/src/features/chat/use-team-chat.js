import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api.js';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { useSocket } from '@/features/realtime/socket-provider.jsx';

const PAGE = 30;
const TYPING_IDLE_MS = 2000;
const TYPING_EXPIRY_MS = 4000;

/** Appends a message unless it is already there; an echo with a known clientId replaces the optimistic copy. */
function merge(list, incoming) {
  const index = list.findIndex((m) => m.id === incoming.id || (incoming.clientId && m.clientId === incoming.clientId));
  if (index === -1) return [...list, incoming];
  const next = [...list];
  next[index] = incoming;
  return next;
}

/**
 * Live chat state for one team: history (oldest first), optimistic sends, typing, presence and
 * "load older". Joins the socket room while mounted and leaves on unmount.
 */
export function useTeamChat(teamId) {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = useMemo(() => ['messages', teamId], [teamId]);
  const [online, setOnline] = useState(0);
  const [typing, setTyping] = useState({});
  const [loadingOlder, setLoadingOlder] = useState(false);
  const typingTimers = useRef({});
  const idleTimer = useRef(null);
  const isTyping = useRef(false);

  const history = useQuery({
    queryKey: key,
    queryFn: async () => {
      const page = await api(`/api/teams/${teamId}/messages?limit=${PAGE}`);
      return { messages: [...page.items].reverse(), hasMore: page.hasMore };
    },
    staleTime: Infinity,
    gcTime: 0,
  });

  const update = useCallback(
    (fn) => qc.setQueryData(key, (data) => (data ? { ...data, messages: fn(data.messages) } : data)),
    [qc, key],
  );

  useEffect(() => {
    if (!connected) return undefined;
    const onMessage = (m) => m.teamId === teamId && update((list) => merge(list, m));
    const onPresence = (p) => p.teamId === teamId && setOnline(p.online);
    const onTyping = (t) => {
      if (t.teamId !== teamId || t.userId === user.id) return;
      clearTimeout(typingTimers.current[t.userId]);
      setTyping((prev) => {
        const next = { ...prev };
        if (t.isTyping) next[t.userId] = t.name;
        else delete next[t.userId];
        return next;
      });
      if (t.isTyping) {
        typingTimers.current[t.userId] = setTimeout(
          () => setTyping((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== t.userId))),
          TYPING_EXPIRY_MS,
        );
      }
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:presence', onPresence);
    socket.on('chat:typing', onTyping);
    socket.emit('chat:join', { teamId }, (ack) => ack?.ok && setOnline(ack.online));
    const timers = typingTimers.current;
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:presence', onPresence);
      socket.off('chat:typing', onTyping);
      socket.emit('chat:leave', { teamId });
      Object.values(timers).forEach(clearTimeout);
    };
  }, [connected, socket, teamId, user.id, update]);

  const send = useCallback(
    async (body) => {
      const clientId = crypto.randomUUID();
      const optimistic = {
        id: clientId,
        clientId,
        teamId,
        body,
        createdAt: new Date().toISOString(),
        sender: { id: user.id, name: user.name },
        status: 'sending',
      };
      update((list) => [...list, optimistic]);
      const fail = (message) => {
        update((list) => list.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m)));
        toast.error(message);
      };
      if (connected) {
        socket.emit(
          'chat:send',
          { teamId, body, clientId },
          (ack) => !ack?.ok && fail(ack?.error ?? 'Message not sent'),
        );
        return;
      }
      try {
        const saved = await api(`/api/teams/${teamId}/messages`, { method: 'POST', body: { body } });
        update((list) => merge(list, { ...saved, clientId }));
      } catch (err) {
        fail(err.message);
      }
    },
    [connected, socket, teamId, update, user.id, user.name],
  );

  const setTypingState = useCallback(
    (next) => {
      if (!connected || isTyping.current === next) return;
      isTyping.current = next;
      socket.emit('chat:typing', { teamId, isTyping: next });
    },
    [connected, socket, teamId],
  );

  /** Call on every keystroke: announces typing and schedules the "stopped" event. */
  const notifyTyping = useCallback(() => {
    setTypingState(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setTypingState(false), TYPING_IDLE_MS);
  }, [setTypingState]);

  const stopTyping = useCallback(() => {
    clearTimeout(idleTimer.current);
    setTypingState(false);
  }, [setTypingState]);

  const loadOlder = useCallback(async () => {
    const first = history.data?.messages.find((m) => !m.status);
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api(`/api/teams/${teamId}/messages?limit=${PAGE}&before=${first.id}`);
      qc.setQueryData(key, (data) => ({
        messages: [...[...page.items].reverse(), ...data.messages],
        hasMore: page.hasMore,
      }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [history.data, loadingOlder, qc, teamId, key]);

  return {
    messages: history.data?.messages ?? [],
    hasMore: history.data?.hasMore ?? false,
    isPending: history.isPending,
    error: history.error,
    refetch: history.refetch,
    online,
    typingNames: Object.values(typing),
    send,
    notifyTyping,
    stopTyping,
    loadOlder,
    loadingOlder,
  };
}
