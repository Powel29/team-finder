import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

export const app = createApp();

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Message","Notification","Request","TeamMember","RoleSkill","Role","TeamTech","Team","MemberSkill","MemberProfile","Skill","User" RESTART IDENTITY CASCADE',
  );
}

let counter = 0;

/** Registers a user through the API and returns a supertest agent that carries the session cookie. */
export async function createUser(overrides = {}) {
  counter += 1;
  const body = {
    name: overrides.name ?? `User ${counter}`,
    email: overrides.email ?? `user${counter}-${Date.now()}@test.dev`,
    password: overrides.password ?? 'Password123!',
  };
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user, password: body.password };
}

export const skill = async (agent, name) => (await agent.post('/api/skills').send({ name })).body;

/** Creates a team through the API. `roles` entries may use skill names; they are created on the fly. */
export async function createTeam(agent, overrides = {}) {
  const body = {
    name: 'Test Team',
    idea: 'Build something useful together.',
    type: 'HACKATHON',
    teamSize: 4,
    techStackNames: ['React'],
    roles: [{ title: 'Frontend', slots: 2, requiredSkillNames: ['React'], niceToHaveSkillNames: ['Tailwind CSS'] }],
    ...overrides,
  };
  const res = await agent.post('/api/teams').send(body);
  if (res.status !== 201) throw new Error(`createTeam failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function createProfile(agent, overrides = {}) {
  const res = await agent.put('/api/members/me').send({
    headline: 'Dev',
    bio: 'Builder',
    skillNames: ['React'],
    experienceLevel: 'INTERMEDIATE',
    availabilityHrs: 10,
    interests: [],
    lookingFor: ['HACKATHON'],
    isDiscoverable: true,
    ...overrides,
  });
  if (res.status !== 200) throw new Error(`createProfile failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Boots the real HTTP + Socket.io stack on an ephemeral port for realtime tests. */
export async function startRealtimeServer() {
  const http = await import('node:http');
  const { initSocket } = await import('../sockets/index.js');
  const server = http.createServer(app);
  const io = await initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const url = `http://localhost:${server.address().port}`;
  const sockets = [];

  /** Connects a socket.io client using the same token flow as the browser. */
  const connect = async (agent, tokenOverride) => {
    const { io: connectClient } = await import('socket.io-client');
    const token = tokenOverride ?? (await agent.get('/api/auth/socket-token')).body.token;
    const socket = connectClient(url, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  };

  const close = async () => {
    sockets.forEach((s) => s.disconnect());
    await io.close();
  };
  return { url, connect, close };
}

export const nextEvent = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
