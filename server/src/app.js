import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redisStatus } from './lib/redis.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuthLimiter, createGeneralLimiter } from './middleware/rate-limiters.js';
import { originCheck } from './middleware/origin-check.js';
import { apiRoutes } from './routes.js';

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

/**
 * @param {{ authRateLimit?: number, generalRateLimit?: number }} [options]
 */
export function createApp(options = {}) {
  const app = express();
  if (env.isProd) app.set('trust proxy', 1);

  const csp = env.SERVE_CLIENT
    ? {
        directives: {
          'default-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'connect-src': ["'self'", 'ws:', 'wss:'],
          'img-src': ["'self'", 'data:'],
        },
      }
    : undefined;
  app.use(helmet(csp ? { contentSecurityPolicy: csp } : undefined));
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(pinoHttp({ logger, autoLogging: !env.isTest }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', createGeneralLimiter(options.generalRateLimit ?? (env.isTest ? 100_000 : 300)));
  app.use('/api', originCheck(env.clientOrigins));

  app.get('/api/health', async (_req, res) => {
    const db = await prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    res.json({ status: db ? 'ok' : 'degraded', db, redis: redisStatus(), uptime: Math.round(process.uptime()) });
  });

  app.use('/api', apiRoutes(createAuthLimiter(options.authRateLimit ?? (env.isTest ? 100_000 : 10))));
  app.use('/api', notFoundHandler);

  if (env.SERVE_CLIENT) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/(api|socket\.io)\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
