import { AppError } from '../lib/errors.js';
import { assertTeamMember } from '../modules/teams/team-guards.js';
import { sendMessage } from '../modules/chat/chat.service.js';
import { socketSendSchema, socketTeamSchema } from '../modules/chat/chat.schema.js';

const RATE_LIMIT = { max: 10, windowMs: 10_000 };
const room = (teamId) => `team:${teamId}`;

/** Per-user sliding window: at most 10 messages every 10 seconds. */
function createRateLimiter({ max, windowMs }) {
  const hits = new Map();
  return (userId) => {
    const now = Date.now();
    const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(userId, recent);
      return false;
    }
    hits.set(userId, [...recent, now]);
    return true;
  };
}

const errorAck = (err) => ({
  ok: false,
  error: err instanceof AppError ? err.message : 'Something went wrong',
  code: err.code ?? 'INTERNAL',
});

/** Distinct users currently in a team room, correct across instances when an adapter is configured. */
async function onlineCount(io, teamId, excludeSocketId) {
  const sockets = await io.in(room(teamId)).fetchSockets();
  return new Set(sockets.filter((s) => s.id !== excludeSocketId).map((s) => s.data.userId)).size;
}

const allowSend = createRateLimiter(RATE_LIMIT);

export function registerChatHandlers(io, socket) {
  const { userId } = socket.data;

  const broadcastPresence = async (teamId, excludeSocketId) =>
    io.to(room(teamId)).emit('chat:presence', { teamId, online: await onlineCount(io, teamId, excludeSocketId) });

  /** Wraps a handler so malformed payloads and failures always answer through the ack. */
  const handle = (schema, fn) => async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return reply({ ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
    try {
      reply(await fn(parsed.data));
    } catch (err) {
      reply(errorAck(err));
    }
  };

  socket.on(
    'chat:join',
    handle(socketTeamSchema, async ({ teamId }) => {
      await assertTeamMember(teamId, userId);
      await socket.join(room(teamId));
      await broadcastPresence(teamId);
      return { ok: true, online: await onlineCount(io, teamId) };
    }),
  );

  socket.on(
    'chat:leave',
    handle(socketTeamSchema, async ({ teamId }) => {
      await socket.leave(room(teamId));
      await broadcastPresence(teamId);
      return { ok: true };
    }),
  );

  socket.on(
    'chat:send',
    handle(socketSendSchema, async ({ teamId, body, clientId }) => {
      if (!allowSend(userId)) throw new AppError(429, 'RATE_LIMITED', 'You are sending messages too fast');
      return { ok: true, message: await sendMessage(teamId, userId, body, clientId) };
    }),
  );

  socket.on('chat:typing', (payload) => {
    const parsed = socketTeamSchema.safeParse(payload);
    if (!parsed.success || !socket.rooms.has(room(parsed.data.teamId))) return;
    socket.to(room(parsed.data.teamId)).emit('chat:typing', {
      teamId: parsed.data.teamId,
      userId,
      name: socket.data.name,
      isTyping: Boolean(payload.isTyping),
    });
  });

  socket.on('disconnecting', () => {
    const teams = [...socket.rooms].filter((r) => r.startsWith('team:')).map((r) => r.slice(5));
    teams.forEach((teamId) => broadcastPresence(teamId, socket.id));
  });
}
