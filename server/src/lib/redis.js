import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

function createRedisOrNull(url) {
  if (!url) return null;
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (attempt) => (attempt > 3 ? null : attempt * 200),
  });
  let warned = false;
  client.on('error', (err) => {
    if (warned) return;
    warned = true;
    logger.warn({ err: err.message }, 'Redis unavailable, continuing without cache');
  });
  client.on('ready', () => {
    warned = false;
  });
  return client;
}

/** ioredis instance, or null when REDIS_URL is not configured. */
export const redis = env.isTest ? null : createRedisOrNull(env.REDIS_URL);

export async function connectRedis() {
  if (!redis) return;
  try {
    await redis.connect();
  } catch {
    // The error listener already logged it; the app keeps working without Redis.
  }
}

/** @returns {'disabled' | boolean} */
export const redisStatus = () => (redis ? redis.status === 'ready' : 'disabled');
