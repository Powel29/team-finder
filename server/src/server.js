import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { connectRedis, redis } from './lib/redis.js';
import { initSocket } from './sockets/index.js';

await connectRedis();
const server = http.createServer(createApp());
await initSocket(server);

server.listen(env.PORT, () => logger.info(`API listening on http://localhost:${env.PORT}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  redis?.disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
