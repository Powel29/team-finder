import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { verifyToken } from '../lib/jwt.js';
import { setIo } from '../lib/socket.js';
import { prisma } from '../lib/prisma.js';
import { registerChatHandlers } from './chat.js';

async function attachRedisAdapter(io) {
  if (!redis || redis.status !== 'ready') return;
  try {
    const sub = redis.duplicate();
    await sub.connect();
    io.adapter(createAdapter(redis, sub));
    logger.info('Socket.io Redis adapter enabled');
  } catch (err) {
    logger.warn({ err: err.message }, 'Socket.io Redis adapter unavailable, using the in-memory adapter');
  }
}

/**
 * Attaches Socket.io to the HTTP server. Clients authenticate with the short-lived token from
 * GET /api/auth/socket-token so it works cross-site without third-party cookies.
 * @param {import('node:http').Server} httpServer
 */
export async function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    const payload = verifyToken(socket.handshake.auth?.token, 'socket');
    if (!payload) return next(new Error('UNAUTHENTICATED'));
    const user = await prisma.user
      .findUnique({ where: { id: payload.sub }, select: { id: true, name: true } })
      .catch(() => null);
    if (!user) return next(new Error('UNAUTHENTICATED'));
    socket.data.userId = user.id;
    socket.data.name = user.name;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    registerChatHandlers(io, socket);
    socket.on('notifications:read', (_payload, ack) => typeof ack === 'function' && ack({ ok: true }));
  });

  await attachRedisAdapter(io);
  setIo(io);
  return io;
}
