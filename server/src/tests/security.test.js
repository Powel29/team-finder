import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app, createProfile, createTeam, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);

describe('no private data in responses', () => {
  it('never exposes emails or password hashes of other users through any endpoint', async () => {
    const owner = await createUser({ name: 'Olive', email: 'olive.secret@private.dev' });
    const member = await createUser({ name: 'Mia', email: 'mia.secret@private.dev' });
    const viewer = await createUser({ name: 'Vic', email: 'vic.secret@private.dev' });
    for (const u of [member, viewer]) await createProfile(u.agent);
    const team = await createTeam(owner.agent, { roles: [{ title: 'Dev', slots: 2, requiredSkillNames: ['React'] }] });
    const roleId = team.roles[0].id;
    const req = await member.agent.post('/api/requests/join').send({ teamId: team.id, roleId, message: 'hi' });
    await owner.agent.post(`/api/requests/${req.body.id}/accept`);
    await owner.agent.post(`/api/teams/${team.id}/messages`).send({ body: 'welcome' });

    const paths = [
      '/api/members',
      `/api/members/${member.user.id}`,
      `/api/members/${owner.user.id}`,
      '/api/teams',
      `/api/teams/${team.id}`,
      '/api/teams/mine',
      `/api/teams/${team.id}/messages`,
      '/api/requests',
      '/api/dashboard/summary',
      '/api/dashboard/member',
      '/api/dashboard/owner',
      '/api/notifications',
      '/api/match/recommendations/teams',
      `/api/match/recommendations/members?roleId=${roleId}`,
      '/api/public/featured-teams',
      '/api/skills',
    ];
    for (const path of paths) {
      const res = await viewer.agent.get(path);
      const text = JSON.stringify(res.body);
      expect(text, path).not.toMatch(/passwordHash/i);
      expect(text, path).not.toContain('olive.secret');
      expect(text, path).not.toContain('mia.secret');
    }
    // as the team member and owner too: only the viewer's own email may appear, and only on /auth/me
    for (const agent of [member.agent, owner.agent]) {
      for (const path of paths) {
        const text = JSON.stringify((await agent.get(path)).body);
        expect(text, path).not.toContain('vic.secret');
      }
    }
    expect((await viewer.agent.get('/api/auth/me')).body.user.email).toBe('vic.secret@private.dev');
  });

  it('does not leak the email in request DTOs or notifications', async () => {
    const owner = await createUser({ email: 'owner.hidden@private.dev' });
    const member = await createUser({ email: 'member.hidden@private.dev' });
    await createProfile(member.agent);
    const team = await createTeam(owner.agent);
    await member.agent.post('/api/requests/join').send({ teamId: team.id, roleId: team.roles[0].id });
    for (const agent of [owner.agent, member.agent]) {
      const text = JSON.stringify([
        (await agent.get('/api/requests')).body,
        (await agent.get('/api/notifications')).body,
      ]);
      expect(text).not.toContain('hidden@private.dev');
    }
  });
});

describe('HTTP hardening', () => {
  it('sets helmet security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('only allows CORS from the configured origin and supports credentials', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects oversized bodies and malformed JSON with a clean error', async () => {
    const big = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.dev', password: 'x'.repeat(200_000) });
    expect(big.status).toBe(413);
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{not json');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('answers unknown API routes with the JSON error shape', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects forged and tampered session tokens', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const forged = jwt.sign({ sub: 'someone', purpose: 'session' }, 'wrong-secret-wrong-secret-wrong-secret');
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
    const { signSocketToken } = await import('../lib/jwt.js');
    expect(
      (
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${signSocketToken('x')}`)
      ).status,
    ).toBe(401);
  });
});

describe('production cookie settings', () => {
  it('uses Secure + SameSite=None cross-site, and Lax when the API serves the client', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SERVE_CLIENT', 'false');
    let jwt = await import('../lib/jwt.js');
    expect(jwt.cookieOptions()).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    expect(jwt.clearCookieOptions().maxAge).toBeUndefined();

    vi.resetModules();
    vi.stubEnv('SERVE_CLIENT', 'true');
    jwt = await import('../lib/jwt.js');
    expect(jwt.cookieOptions()).toMatchObject({ secure: true, sameSite: 'lax' });
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe('environment validation', () => {
  it('fails fast with readable messages', async () => {
    const { loadEnv } = await import('../config/env.js');
    expect(() => loadEnv({ DATABASE_URL: '', JWT_SECRET: 'short' })).toThrow(
      /DATABASE_URL.*\n.*JWT_SECRET must be at least 32/s,
    );
    const ok = loadEnv({
      DATABASE_URL: 'postgresql://x',
      JWT_SECRET: 'x'.repeat(32),
      CLIENT_ORIGIN: 'http://a.dev, http://b.dev',
      REDIS_URL: '',
    });
    expect(ok.clientOrigins).toEqual(['http://a.dev', 'http://b.dev']);
    expect(ok.REDIS_URL).toBeUndefined();
  });
});
