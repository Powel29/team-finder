import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createProfile, createTeam, createUser, nextEvent, resetDb, startRealtimeServer } from './helpers.js';
import { prisma } from '../lib/prisma.js';
import { scanForMember, scanForRole } from '../modules/match/match-notifier.js';
import { setIo } from '../lib/socket.js';

beforeEach(resetDb);

async function pending() {
  const owner = await createUser({ name: 'Olive' });
  const member = await createUser({ name: 'Mia' });
  await createProfile(member.agent, { skillNames: ['React'] });
  const team = await createTeam(owner.agent, {
    name: 'Alpha',
    roles: [{ title: 'Frontend', slots: 1, requiredSkillNames: ['React'] }],
  });
  return { owner, member, team, roleId: team.roles[0].id };
}

describe('notifications REST', () => {
  it('counts, lists, marks one read and marks all read', async () => {
    const { owner, member, team, roleId } = await pending();
    await member.agent.post('/api/requests/join').send({ teamId: team.id, roleId });
    const other = await createUser();
    await createProfile(other.agent);
    await other.agent.post('/api/requests/join').send({ teamId: team.id, roleId });

    expect((await owner.agent.get('/api/notifications/unread-count')).body).toEqual({ count: 2 });
    const list = (await owner.agent.get('/api/notifications')).body;
    expect(list).toMatchObject({ total: 2, page: 1 });
    expect(list.items[0]).toMatchObject({ type: 'REQUEST_RECEIVED', readAt: null });

    const marked = await owner.agent.post(`/api/notifications/${list.items[0].id}/read`);
    expect(marked.body).toEqual({ count: 1 });
    expect((await owner.agent.get('/api/notifications?unread=true')).body.total).toBe(1);
    expect((await owner.agent.post('/api/notifications/read-all')).body).toEqual({ count: 0 });
    expect((await owner.agent.get('/api/notifications/unread-count')).body).toEqual({ count: 0 });
    expect((await owner.agent.get('/api/auth/me')).body.unreadNotifications).toBe(0);
  });

  it('never lets users read or mark other users notifications', async () => {
    const { owner, member, team, roleId } = await pending();
    await member.agent.post('/api/requests/join').send({ teamId: team.id, roleId });
    const id = (await owner.agent.get('/api/notifications')).body.items[0].id;
    expect((await member.agent.post(`/api/notifications/${id}/read`)).status).toBe(404);
    expect((await member.agent.get('/api/notifications')).body.items.find((n) => n.id === id)).toBeUndefined();
    expect((await owner.agent.get('/api/notifications/unread-count')).body.count).toBe(1);
  });

  it('requires auth', async () => {
    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    expect((await request(app).get('/api/notifications')).status).toBe(401);
  });
});

describe('NEW_MATCH generation', () => {
  it('notifies the owner when a strong-matching profile appears, once per day per pair', async () => {
    const owner = await createUser({ name: 'Olive' });
    await createTeam(owner.agent, {
      name: 'Alpha',
      roles: [{ title: 'Frontend', slots: 1, requiredSkillNames: ['React', 'TypeScript'] }],
    });
    const member = await createUser({ name: 'Mia' });
    await createProfile(member.agent, { skillNames: ['React', 'TypeScript'], availabilityHrs: 20 });

    expect(await scanForMember(member.user.id)).toBe(1);
    const notes = (await owner.agent.get('/api/notifications')).body.items;
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ type: 'NEW_MATCH', title: 'New match for your team' });
    expect(notes[0].body).toBe('Mia is a 100% match for Frontend in Alpha');
    expect(notes[0].link).toContain(`/people/${member.user.id}?roleId=`);
    expect(await scanForMember(member.user.id)).toBe(0);
    expect((await owner.agent.get('/api/notifications')).body.total).toBe(1);
  });

  it('ignores weak matches, hidden profiles and members already on the team', async () => {
    const owner = await createUser();
    const team = await createTeam(owner.agent, {
      roles: [{ title: 'Frontend', slots: 2, requiredSkillNames: ['React', 'TypeScript'] }],
    });
    const weak = await createUser();
    await createProfile(weak.agent, { skillNames: ['Python'] });
    const hidden = await createUser();
    await createProfile(hidden.agent, { skillNames: ['React', 'TypeScript'], isDiscoverable: false });
    const onTeam = await createUser();
    await createProfile(onTeam.agent, { skillNames: ['React', 'TypeScript'] });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: onTeam.user.id } });
    for (const u of [weak, hidden, onTeam]) expect(await scanForMember(u.user.id)).toBe(0);
    expect((await owner.agent.get('/api/notifications')).body.total).toBe(0);
  });

  it('caps notifications per profile update at 5', async () => {
    const owner = await createUser();
    for (let i = 0; i < 7; i += 1)
      await createTeam(owner.agent, {
        name: `T${i}`,
        roles: [{ title: 'Dev', slots: 1, requiredSkillNames: ['React'] }],
      });
    const member = await createUser();
    await createProfile(member.agent, { skillNames: ['React'], availabilityHrs: 20 });
    expect(await scanForMember(member.user.id)).toBe(5);
  });

  it('notifies matching members when a role is created, without duplicates', async () => {
    const member = await createUser({ name: 'Mia' });
    await createProfile(member.agent, { skillNames: ['React', 'TypeScript'], availabilityHrs: 20 });
    const owner = await createUser();
    const team = await createTeam(owner.agent, {
      name: 'Alpha',
      roles: [{ title: 'Frontend', slots: 1, requiredSkillNames: ['React', 'TypeScript'] }],
    });
    expect(await scanForRole(team.roles[0].id)).toBe(1);
    const notes = (await member.agent.get('/api/notifications')).body.items;
    expect(notes[0]).toMatchObject({
      type: 'NEW_MATCH',
      title: 'New role matches your skills',
      link: `/teams/${team.id}`,
    });
    expect(notes[0].body).toBe('Frontend in Alpha is a 100% match for you');
    expect(await scanForRole(team.roles[0].id)).toBe(0);
  });
});

describe('socket server', () => {
  let rt;
  beforeAll(async () => {
    rt = await startRealtimeServer();
  });
  afterAll(async () => {
    await rt.close();
    setIo(null);
  });

  it('rejects connections without a valid socket token', async () => {
    const { agent } = await createUser();
    await expect(rt.connect(agent, 'garbage')).rejects.toThrow('UNAUTHENTICATED');
  });

  it('rejects a session token used as a socket token', async () => {
    const { user } = await createUser();
    const { signSessionToken } = await import('../lib/jwt.js');
    await expect(rt.connect(null, signSessionToken(user))).rejects.toThrow('UNAUTHENTICATED');
  });

  it('pushes notification:new and requests:changed live to the recipient', async () => {
    const { owner, member, team, roleId } = await pending();
    const socket = await rt.connect(owner.agent);
    const note = nextEvent(socket, 'notification:new');
    const changed = nextEvent(socket, 'requests:changed');
    await member.agent.post('/api/requests/join').send({ teamId: team.id, roleId, message: 'hi' });
    expect(await note).toMatchObject({ type: 'REQUEST_RECEIVED', unreadCount: 1 });
    expect(await changed).toMatchObject({ status: 'PENDING' });
  });

  it('does not deliver another users notifications', async () => {
    const { owner, member, team, roleId } = await pending();
    const bystander = await createUser();
    const socket = await rt.connect(bystander.agent);
    let received = false;
    socket.on('notification:new', () => {
      received = true;
    });
    const ownerSocket = await rt.connect(owner.agent);
    const delivered = nextEvent(ownerSocket, 'notification:new');
    await member.agent.post('/api/requests/join').send({ teamId: team.id, roleId });
    await delivered;
    expect(received).toBe(false);
  });
});
