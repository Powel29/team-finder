import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createProfile, createTeam, createUser, nextEvent, resetDb, startRealtimeServer } from './helpers.js';
import { prisma } from '../lib/prisma.js';
import { setIo } from '../lib/socket.js';

beforeEach(resetDb);

async function world() {
  const owner = await createUser({ name: 'Olive' });
  const member = await createUser({ name: 'Mia' });
  const outsider = await createUser({ name: 'Otto' });
  await createProfile(member.agent);
  const team = await createTeam(owner.agent, {
    name: 'Alpha',
    roles: [{ title: 'Dev', slots: 2, requiredSkillNames: ['React'] }],
  });
  const req = await member.agent.post('/api/requests/join').send({ teamId: team.id, roleId: team.roles[0].id });
  await owner.agent.post(`/api/requests/${req.body.id}/accept`);
  return { owner, member, outsider, team };
}

describe('chat REST', () => {
  it('rejects non-members with 403 and unknown teams with 404', async () => {
    const { outsider, team } = await world();
    expect((await outsider.agent.get(`/api/teams/${team.id}/messages`)).status).toBe(403);
    expect((await outsider.agent.post(`/api/teams/${team.id}/messages`).send({ body: 'hi' })).status).toBe(403);
    expect((await outsider.agent.get('/api/teams/missing/messages')).status).toBe(404);
  });

  it('lets members and the owner post and read, and validates the body', async () => {
    const { owner, member, team } = await world();
    const posted = await member.agent.post(`/api/teams/${team.id}/messages`).send({ body: '  hello team  ' });
    expect(posted.status).toBe(201);
    expect(posted.body).toMatchObject({ body: 'hello team', sender: { name: 'Mia' } });
    expect(posted.body.sender.email).toBeUndefined();
    const read = await owner.agent.get(`/api/teams/${team.id}/messages`);
    expect(read.body.items.map((m) => m.body)).toEqual(['hello team']);
    expect((await owner.agent.post(`/api/teams/${team.id}/messages`).send({ body: '   ' })).status).toBe(400);
    expect((await owner.agent.post(`/api/teams/${team.id}/messages`).send({ body: 'x'.repeat(2001) })).status).toBe(
      400,
    );
  });

  it('pages history newest first with a stable cursor and hasMore', async () => {
    const { owner, team } = await world();
    for (let i = 1; i <= 7; i += 1) await owner.agent.post(`/api/teams/${team.id}/messages`).send({ body: `m${i}` });
    const first = (await owner.agent.get(`/api/teams/${team.id}/messages?limit=3`)).body;
    expect(first.items.map((m) => m.body)).toEqual(['m7', 'm6', 'm5']);
    expect(first.hasMore).toBe(true);
    const second = (await owner.agent.get(`/api/teams/${team.id}/messages?limit=3&before=${first.items[2].id}`)).body;
    expect(second.items.map((m) => m.body)).toEqual(['m4', 'm3', 'm2']);
    const last = (await owner.agent.get(`/api/teams/${team.id}/messages?limit=3&before=${second.items[2].id}`)).body;
    expect(last.items.map((m) => m.body)).toEqual(['m1']);
    expect(last.hasMore).toBe(false);
  });

  it('loses access after being removed', async () => {
    const { owner, member, team } = await world();
    await owner.agent.delete(`/api/teams/${team.id}/members/${member.user.id}`);
    expect((await member.agent.get(`/api/teams/${team.id}/messages`)).status).toBe(403);
  });
});

describe('chat sockets', () => {
  let rt;
  beforeAll(async () => {
    rt = await startRealtimeServer();
  });
  afterAll(async () => {
    await rt.close();
    setIo(null);
  });

  const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

  it('denies chat:join to non-members and allows members', async () => {
    const { owner, outsider, team } = await world();
    const out = await rt.connect(outsider.agent);
    expect(await emit(out, 'chat:join', { teamId: team.id })).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    const own = await rt.connect(owner.agent);
    expect(await emit(own, 'chat:join', { teamId: team.id })).toEqual({ ok: true, online: 1 });
    expect(await emit(own, 'chat:join', {})).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('persists a message and delivers it live to a second client, echoing the clientId', async () => {
    const { owner, member, team } = await world();
    const a = await rt.connect(owner.agent);
    const b = await rt.connect(member.agent);
    await emit(a, 'chat:join', { teamId: team.id });
    expect(await emit(b, 'chat:join', { teamId: team.id })).toMatchObject({ ok: true, online: 2 });

    const incoming = nextEvent(b, 'chat:message');
    const ack = await emit(a, 'chat:send', { teamId: team.id, body: 'hello live', clientId: 'c-1' });
    expect(ack).toMatchObject({
      ok: true,
      message: { body: 'hello live', clientId: 'c-1', sender: { name: 'Olive' } },
    });
    expect(await incoming).toMatchObject({ body: 'hello live', teamId: team.id, clientId: 'c-1' });
    expect(await prisma.message.count({ where: { teamId: team.id } })).toBe(1);
  });

  it('does not deliver to non-members, and rejects their sends', async () => {
    const { owner, outsider, team } = await world();
    const a = await rt.connect(owner.agent);
    const out = await rt.connect(outsider.agent);
    await emit(a, 'chat:join', { teamId: team.id });
    let leaked = false;
    out.on('chat:message', () => {
      leaked = true;
    });
    expect(await emit(out, 'chat:send', { teamId: team.id, body: 'sneaky' })).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
    });
    const echoed = nextEvent(a, 'chat:message');
    await emit(a, 'chat:send', { teamId: team.id, body: 'private' });
    await echoed;
    expect(leaked).toBe(false);
  });

  it('relays typing to others only and tracks presence', async () => {
    const { owner, member, team } = await world();
    const a = await rt.connect(owner.agent);
    const b = await rt.connect(member.agent);
    await emit(a, 'chat:join', { teamId: team.id });
    const joined = nextEvent(a, 'chat:presence');
    await emit(b, 'chat:join', { teamId: team.id });
    expect((await joined).online).toBe(2);

    let selfTyping = false;
    a.on('chat:typing', () => {
      selfTyping = true;
    });
    const typing = nextEvent(b, 'chat:typing');
    a.emit('chat:typing', { teamId: team.id, isTyping: true });
    expect(await typing).toMatchObject({ teamId: team.id, name: 'Olive', isTyping: true });
    expect(selfTyping).toBe(false);

    const left = nextEvent(a, 'chat:presence');
    b.disconnect();
    expect((await left).online).toBe(1);
  });

  it('notifies other members with chat:unread', async () => {
    const { owner, member, team } = await world();
    const a = await rt.connect(owner.agent);
    const b = await rt.connect(member.agent);
    const unread = nextEvent(b, 'chat:unread');
    await emit(a, 'chat:join', { teamId: team.id });
    await emit(a, 'chat:send', { teamId: team.id, body: 'ping' });
    expect(await unread).toEqual({ teamId: team.id });
  });

  it('stops delivering to a removed member', async () => {
    const { owner, member, team } = await world();
    const a = await rt.connect(owner.agent);
    const b = await rt.connect(member.agent);
    await emit(a, 'chat:join', { teamId: team.id });
    await emit(b, 'chat:join', { teamId: team.id });
    await owner.agent.delete(`/api/teams/${team.id}/members/${member.user.id}`);
    let received = false;
    b.on('chat:message', () => {
      received = true;
    });
    const echoed = nextEvent(a, 'chat:message');
    await emit(a, 'chat:send', { teamId: team.id, body: 'after removal' });
    await echoed;
    await new Promise((r) => setTimeout(r, 150));
    expect(received).toBe(false);
    expect(await emit(b, 'chat:send', { teamId: team.id, body: 'still here?' })).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
    });
  });

  it('rate limits to 10 messages per 10 seconds', async () => {
    const { owner, team } = await world();
    const a = await rt.connect(owner.agent);
    await emit(a, 'chat:join', { teamId: team.id });
    const acks = [];
    for (let i = 0; i < 11; i += 1) acks.push(await emit(a, 'chat:send', { teamId: team.id, body: `spam ${i}` }));
    expect(acks.filter((x) => x.ok)).toHaveLength(10);
    expect(acks[10]).toMatchObject({ ok: false, code: 'RATE_LIMITED' });
  });
});
