import { redis } from './redis.js';

/**
 * Builds a cache around a (possibly absent) Redis client. Every method swallows Redis
 * errors and falls back to the loader, so the app never depends on Redis being up.
 * @param {() => import('ioredis').Redis | null} getClient
 */
export function createCache(getClient) {
  const usable = () => {
    const client = getClient();
    return client && client.status === 'ready' ? client : null;
  };

  return {
    async getOrSet(key, ttlSeconds, loader) {
      const client = usable();
      if (!client) return loader();
      try {
        const hit = await client.get(key);
        if (hit !== null) return JSON.parse(hit);
      } catch {
        return loader();
      }
      const value = await loader();
      try {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch {
        // cache write failures are not fatal
      }
      return value;
    },

    async version(family) {
      const client = usable();
      if (!client) return 1;
      try {
        // The stored counter starts at 0, so the first bump moves the visible version from 1 to 2.
        return (Number(await client.get(`cache:ver:${family}`)) || 0) + 1;
      } catch {
        return 1;
      }
    },

    async bump(...families) {
      const client = usable();
      if (!client) return;
      try {
        await Promise.all(families.map((f) => client.incr(`cache:ver:${f}`)));
      } catch {
        // a missed bump only means entries expire by TTL
      }
    },
  };
}

export const cache = createCache(() => redis);
