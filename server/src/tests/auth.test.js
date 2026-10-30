import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, createUser, resetDb } from './helpers.js';
import { createApp } from '../app.js';

beforeEach(resetDb);

describe('auth', () => {
  it('registers and sets an httpOnly cookie, never returning the hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ann', email: 'Ann@Test.dev', password: 'Password123!' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ann', email: 'ann@test.dev' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/tf_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('rejects duplicate email with 409', async () => {
    const { user } = await createUser();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: user.email, password: 'Password123!' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects weak passwords and bad emails with details', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.path).sort()).toEqual(['email', 'password']);
  });

  it('logs in, and fails generically on a wrong password', async () => {
    const { user, password } = await createUser();
    const ok = await request(app).post('/api/auth/login').send({ email: user.email, password });
    expect(ok.status).toBe(200);
    expect(ok.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    const bad = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe('Invalid email or password');
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@test.dev', password });
    expect(unknown.body.error.message).toBe('Invalid email or password');
  });

  it('requires auth for me and socket-token, and returns session info', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/socket-token')).status).toBe(401);
    const { agent, user } = await createUser();
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      user: { id: user.id },
      hasMemberProfile: false,
      unreadNotifications: 0,
      ownedTeamCount: 0,
    });
    const token = await agent.get('/api/auth/socket-token');
    expect(token.body.token).toBeTruthy();
  });

  it('logout clears the cookie', async () => {
    const { agent } = await createUser();
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie'][0]).toMatch(/tf_token=;/);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('rate limits login attempts with 429', async () => {
    const limited = createApp({ authRateLimit: 3 });
    const attempt = () => request(limited).post('/api/auth/login').send({ email: 'a@test.dev', password: 'whatever1' });
    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const res = await attempt();
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('rejects state-changing requests from a foreign origin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'a@test.dev', password: 'whatever1' });
    expect(res.status).toBe(403);
  });
});

describe('health', () => {
  it('reports ok and redis disabled without REDIS_URL', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: true, redis: 'disabled' });
  });
});
