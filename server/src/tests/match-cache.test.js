import { beforeEach, describe, expect, it, vi } from 'vitest';

// Replace the Redis client with an in-memory fake so the real service/cache path is exercised.
vi.mock('../lib/redis.js', () => {
  const store = new Map();
  return {
    redis: {
      status: 'ready',
      get: async (k) => store.get(k) ?? null,
      set: async (k, v) => store.set(k, v),
      incr: async (k) => {
        store.set(k, String(Number(store.get(k) ?? 0) + 1));
      },
      __store: store,
    },
    redisStatus: () => true,
    connectRedis: async () => {},
  };
});

const { redis } = await import('../lib/redis.js');
const { createProfile, createTeam, createUser, resetDb } = await import('./helpers.js');

beforeEach(async () => {
  redis.__store.clear();
  await resetDb();
});

describe('match caching through the service', () => {
  it('caches the score and invalidates it when the profile changes', async () => {
    const owner = await createUser();
    const member = await createUser();
    const team = await createTeam(owner.agent, {
      roles: [{ title: 'Dev', slots: 1, requiredSkillNames: ['React', 'Go'] }],
    });
    const roleId = team.roles[0].id;
    await createProfile(member.agent, { skillNames: ['React'] });

    const first = await member.agent.get(`/api/match?roleId=${roleId}`);
    const keys = [...redis.__store.keys()].filter((k) => k.startsWith('match:v'));
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(new RegExp(`${member.user.id}:${roleId}$`));
    expect((await member.agent.get(`/api/match?roleId=${roleId}`)).body).toEqual(first.body);

    await createProfile(member.agent, { skillNames: ['React', 'Go'] });
    const second = await member.agent.get(`/api/match?roleId=${roleId}`);
    expect(second.body.score).toBeGreaterThan(first.body.score);
    expect([...redis.__store.keys()].filter((k) => k.startsWith('match:v'))).toHaveLength(2);
  });
});
