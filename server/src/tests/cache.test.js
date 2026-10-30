import { describe, expect, it, vi } from 'vitest';
import { createCache } from '../lib/cache.js';

function fakeRedis(overrides = {}) {
  const store = new Map();
  return {
    status: 'ready',
    store,
    get: vi.fn(async (k) => store.get(k) ?? null),
    set: vi.fn(async (k, v) => store.set(k, v)),
    incr: vi.fn(async (k) => {
      const next = Number(store.get(k) ?? 0) + 1;
      store.set(k, String(next));
      return next;
    }),
    ...overrides,
  };
}

describe('cache', () => {
  it('runs the loader once and serves hits from Redis', async () => {
    const client = fakeRedis();
    const cache = createCache(() => client);
    const loader = vi.fn(async () => ({ n: 1 }));
    expect(await cache.getOrSet('k', 60, loader)).toEqual({ n: 1 });
    expect(await cache.getOrSet('k', 60, loader)).toEqual({ n: 1 });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith('k', '{"n":1}', 'EX', 60);
  });

  it('bumping a family changes its version so stale keys are never read', async () => {
    const client = fakeRedis();
    const cache = createCache(() => client);
    expect(await cache.version('people')).toBe(1);
    await cache.bump('people', 'match');
    expect(await cache.version('people')).toBe(2);
    expect(await cache.version('match')).toBe(2);
    expect(await cache.version('teams')).toBe(1);
  });

  it('bypasses the cache when there is no client or it is not ready', async () => {
    const loader = vi.fn(async () => 'fresh');
    expect(await createCache(() => null).getOrSet('k', 1, loader)).toBe('fresh');
    expect(await createCache(() => ({ status: 'connecting' })).getOrSet('k', 1, loader)).toBe('fresh');
    expect(await createCache(() => null).version('x')).toBe(1);
    await expect(createCache(() => null).bump('x')).resolves.toBeUndefined();
  });

  it('never throws when Redis fails mid-flight', async () => {
    const boom = async () => {
      throw new Error('ECONNRESET');
    };
    const broken = fakeRedis({ get: boom, set: boom, incr: boom });
    const cache = createCache(() => broken);
    const loader = vi.fn(async () => 42);
    expect(await cache.getOrSet('k', 60, loader)).toBe(42);
    expect(await cache.version('f')).toBe(1);
    await expect(cache.bump('f')).resolves.toBeUndefined();
    const noWrites = fakeRedis({ set: boom });
    const writeFails = createCache(() => noWrites);
    expect(await writeFails.getOrSet('k', 60, async () => 7)).toBe(7);
  });

  it('still propagates loader errors', async () => {
    const client = fakeRedis();
    const cache = createCache(() => client);
    await expect(cache.getOrSet('k', 60, async () => Promise.reject(new Error('db down')))).rejects.toThrow('db down');
  });
});
