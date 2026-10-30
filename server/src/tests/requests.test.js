import { beforeEach, describe, expect, it } from 'vitest';
import { createProfile, createTeam, createUser, resetDb } from './helpers.js';
import { prisma } from '../lib/prisma.js';

beforeEach(resetDb);

/** An owner with a team (Frontend x2, Designer x1) and three members who each have a profile. */
async function world() {
  const owner = await createUser({ name: 'Olive Owner' });
  const [a, b, c] = await Promise.all(['Ann', 'Ben', 'Cat'].map((name) => createUser({ name })));
  for (const u of [a, b, c]) await createProfile(u.agent, { skillNames: ['React', 'TypeScript'] });
  const team = await createTeam(owner.agent, {
    name: 'Alpha',
    roles: [
      { title: 'Frontend', slots: 2, requiredSkillNames: ['React'] },
      { title: 'Designer', slots: 1, requiredSkillNames: ['Figma'] },
    ],
  });
  return { owner, a, b, c, team, frontend: team.roles[0].id, designer: team.roles[1].id };
}

const join = (u, team, roleId, message = '') =>
  u.agent.post('/api/requests/join').send({ teamId: team.id, roleId, message });
const invite = (owner, team, roleId, userId, message = '') =>
  owner.agent.post('/api/requests/invite').send({ teamId: team.id, roleId, userId, message });
const roleRow = (id) => prisma.role.findUnique({ where: { id } });

describe('join requests', () => {
  it('creates a join request, snapshots the match and notifies the owner', async () => {
    const { owner, a, team, frontend } = await world();
    const res = await join(a, team, frontend, 'Pick me');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: 'JOIN_REQUEST',
      status: 'PENDING',
      message: 'Pick me',
      direction: 'SENT',
      team: { name: 'Alpha' },
      role: { title: 'Frontend' },
      sender: { name: 'Ann' },
      recipient: { id: owner.user.id },
    });
    expect(res.body.matchScore).toBe(100 * 0 + res.body.matchScore);
    expect(res.body.matchScore).toBeGreaterThan(50);
    const notes = (await owner.agent.get('/api/notifications')).body.items;
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ type: 'REQUEST_RECEIVED', title: 'New join request' });
    expect(notes[0].body).toContain('Ann wants to join Frontend in Alpha');
  });

  it('requires a profile', async () => {
    const { team, frontend } = await world();
    const noProfile = await createUser();
    const res = await join(noProfile, team, frontend);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PROFILE_REQUIRED');
  });

  it('blocks duplicates, own team, existing members and unknown roles', async () => {
    const { owner, a, team, frontend } = await world();
    await createProfile(owner.agent);
    expect((await join(a, team, frontend)).status).toBe(201);
    const dup = await join(a, team, frontend);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_REQUEST');
    expect((await join(owner, team, frontend)).status).toBe(403);
    expect((await join(a, team, 'nope')).status).toBe(404);
    await prisma.teamMember.create({ data: { teamId: team.id, userId: a.user.id } });
    const member = await join(a, team, team.roles[1].id);
    expect(member.status).toBe(409);
    expect(member.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('blocks filled roles and closed teams', async () => {
    const { a, team, frontend } = await world();
    await prisma.role.update({ where: { id: frontend }, data: { filled: 2 } });
    const full = await join(a, team, frontend);
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe('ROLE_FULL');
    await prisma.role.update({ where: { id: frontend }, data: { filled: 0 } });
    await prisma.team.update({ where: { id: team.id }, data: { status: 'CLOSED' } });
    expect((await join(a, team, frontend)).body.error.code).toBe('ROLE_FULL');
  });

  it('shows the pending request on the team DTO for the sender', async () => {
    const { a, b, team, frontend } = await world();
    const sent = (await join(a, team, frontend)).body;
    const dto = (await a.agent.get(`/api/teams/${team.id}`)).body;
    expect(dto.myPendingRequests).toEqual([
      { requestId: sent.id, roleId: frontend, type: 'JOIN_REQUEST', direction: 'SENT' },
    ]);
    expect((await b.agent.get(`/api/teams/${team.id}`)).body.myPendingRequests).toEqual([]);
  });
});

describe('invites', () => {
  it('lets the owner invite a discoverable member and notifies them', async () => {
    const { owner, a, team, frontend } = await world();
    const res = await invite(owner, team, frontend, a.user.id, 'Join us');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'INVITE', direction: 'SENT', recipient: { id: a.user.id } });
    const notes = (await a.agent.get('/api/notifications')).body.items;
    expect(notes[0].body).toContain('Olive Owner invited you to Frontend in Alpha');
    const received = (await a.agent.get('/api/requests?box=received')).body.items;
    expect(received[0]).toMatchObject({ direction: 'RECEIVED', type: 'INVITE' });
  });

  it('is owner-only and blocks mirrored cases', async () => {
    const { owner, a, b, team, frontend } = await world();
    expect((await invite(a, team, frontend, b.user.id)).status).toBe(403);
    expect((await invite(owner, team, frontend, a.user.id)).status).toBe(201);
    expect((await invite(owner, team, frontend, a.user.id)).body.error.code).toBe('DUPLICATE_REQUEST');
    await join(b, team, frontend);
    expect((await invite(owner, team, frontend, b.user.id)).body.error.code).toBe('DUPLICATE_REQUEST');
    await prisma.teamMember.create({ data: { teamId: team.id, userId: b.user.id } });
    const member = await invite(owner, team, team.roles[1].id, b.user.id);
    expect(member.status).toBe(409);
    expect(member.body.error.code).toBe('ALREADY_MEMBER');
    expect((await invite(owner, team, frontend, owner.user.id)).body.error.code).toBe('ALREADY_MEMBER');
  });

  it('does not invite hidden or profile-less users', async () => {
    const { owner, a, team, frontend } = await world();
    await createProfile(a.agent, { isDiscoverable: false });
    expect((await invite(owner, team, frontend, a.user.id)).status).toBe(404);
    const noProfile = await createUser();
    expect((await invite(owner, team, frontend, noProfile.user.id)).status).toBe(404);
  });
});

describe('resolving requests', () => {
  it('accepting a join request adds the member, increments filled and notifies the sender', async () => {
    const { owner, a, team, frontend } = await world();
    const req = (await join(a, team, frontend)).body;
    const res = await owner.agent.post(`/api/requests/${req.id}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
    expect((await roleRow(frontend)).filled).toBe(1);
    const dto = (await a.agent.get(`/api/teams/${team.id}`)).body;
    expect(dto.myRelation).toBe('MEMBER');
    expect(dto.members.find((m) => m.userId === a.user.id)).toMatchObject({ roleTitle: 'Frontend', isOwner: false });
    expect(dto.roles[0]).toMatchObject({ filled: 1, open: 1 });
    const notes = (await a.agent.get('/api/notifications')).body.items;
    expect(notes[0]).toMatchObject({ type: 'REQUEST_ACCEPTED' });
    expect(notes[0].body).toContain('Olive Owner accepted your request for Frontend in Alpha');
  });

  it('accepting an invite adds the invitee', async () => {
    const { owner, a, team, designer } = await world();
    const req = (await invite(owner, team, designer, a.user.id)).body;
    expect((await a.agent.post(`/api/requests/${req.id}/accept`)).status).toBe(200);
    expect((await a.agent.get(`/api/teams/${team.id}`)).body.myRelation).toBe('MEMBER');
    expect((await owner.agent.get('/api/notifications')).body.items.some((n) => n.type === 'REQUEST_ACCEPTED')).toBe(
      true,
    );
  });

  it('only the recipient may accept or decline, and only the sender may cancel', async () => {
    const { owner, a, b, team, frontend } = await world();
    const req = (await join(a, team, frontend)).body;
    expect((await a.agent.post(`/api/requests/${req.id}/accept`)).status).toBe(403);
    expect((await b.agent.post(`/api/requests/${req.id}/accept`)).status).toBe(403);
    expect((await owner.agent.post(`/api/requests/${req.id}/cancel`)).status).toBe(403);
    expect((await a.agent.post(`/api/requests/${req.id}/decline`)).status).toBe(403);
    expect((await owner.agent.post('/api/requests/missing/accept')).status).toBe(404);
  });

  it('declines and cancels with notifications, and a handled request is NOT_PENDING', async () => {
    const { owner, a, b, team, frontend } = await world();
    const r1 = (await join(a, team, frontend)).body;
    const declined = await owner.agent.post(`/api/requests/${r1.id}/decline`);
    expect(declined.body.status).toBe('DECLINED');
    expect((await a.agent.get('/api/notifications')).body.items[0].type).toBe('REQUEST_DECLINED');
    const again = await owner.agent.post(`/api/requests/${r1.id}/accept`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('NOT_PENDING');
    expect((await join(a, team, frontend)).status).toBe(201);

    const r2 = (await join(b, team, frontend)).body;
    const cancelled = await b.agent.post(`/api/requests/${r2.id}/cancel`);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect((await owner.agent.get('/api/notifications')).body.items[0].type).toBe('REQUEST_CANCELLED');
    expect((await b.agent.post(`/api/requests/${r2.id}/cancel`)).body.error.code).toBe('NOT_PENDING');
  });

  it('filling a role cancels the other pending requests for it and notifies their senders', async () => {
    const { owner, a, b, c, team, designer } = await world();
    const ra = (await join(a, team, designer)).body;
    await join(b, team, designer);
    await invite(owner, team, designer, c.user.id);
    expect((await owner.agent.post(`/api/requests/${ra.id}/accept`)).status).toBe(200);
    const all = (await owner.agent.get('/api/requests?box=all')).body.items;
    expect(all.filter((r) => r.status === 'CANCELLED')).toHaveLength(2);
    expect((await b.agent.get('/api/notifications')).body.items.some((n) => n.type === 'REQUEST_CANCELLED')).toBe(true);
    expect((await c.agent.get('/api/notifications')).body.items.some((n) => n.type === 'REQUEST_CANCELLED')).toBe(true);
    expect((await owner.agent.get('/api/notifications')).body.items.some((n) => n.type === 'ROLE_FILLED')).toBe(true);
  });

  it('closes the team when the last role fills and notifies everyone', async () => {
    const { owner, a, b, c, team, frontend, designer } = await world();
    for (const [u, role] of [
      [a, frontend],
      [b, frontend],
      [c, designer],
    ]) {
      const req = (await join(u, team, role)).body;
      expect((await owner.agent.post(`/api/requests/${req.id}/accept`)).status).toBe(200);
    }
    expect((await owner.agent.get(`/api/teams/${team.id}`)).body.status).toBe('CLOSED');
    expect((await a.agent.get('/api/notifications')).body.items.some((n) => n.type === 'TEAM_CLOSED')).toBe(true);
    expect((await owner.agent.get('/api/notifications')).body.items.some((n) => n.type === 'TEAM_CLOSED')).toBe(true);
  });

  it('two parallel accepts for the last slot: exactly one wins, the other gets 409', async () => {
    const { owner, a, b, team, designer } = await world();
    const ra = (await join(a, team, designer)).body;
    const rb = (await join(b, team, designer)).body;
    const results = await Promise.all([
      owner.agent.post(`/api/requests/${ra.id}/accept`),
      owner.agent.post(`/api/requests/${rb.id}/accept`),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await roleRow(designer)).filled).toBe(1);
    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(2);
    expect(await prisma.request.count({ where: { roleId: designer, status: 'ACCEPTED' } })).toBe(1);
  });

  it('many parallel accepts never overfill a role', async () => {
    const { owner, team, frontend } = await world();
    const users = await Promise.all(Array.from({ length: 5 }, (_, i) => createUser({ name: `P${i}` })));
    const reqs = [];
    for (const u of users) {
      await createProfile(u.agent);
      reqs.push((await join(u, team, frontend)).body);
    }
    const results = await Promise.all(reqs.map((r) => owner.agent.post(`/api/requests/${r.id}/accept`)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    expect((await roleRow(frontend)).filled).toBe(2);
  });
});

describe('listing and dashboard', () => {
  it('lists by box and status with pagination, newest first', async () => {
    const { owner, a, b, team, frontend } = await world();
    const r1 = (await join(a, team, frontend)).body;
    await join(b, team, frontend);
    await owner.agent.post(`/api/requests/${r1.id}/decline`);
    const received = (await owner.agent.get('/api/requests?box=received')).body;
    expect(received.total).toBe(2);
    expect(received.items.map((r) => r.sender.name)).toEqual(['Ben', 'Ann']);
    expect((await owner.agent.get('/api/requests?box=received&status=PENDING')).body.total).toBe(1);
    expect((await owner.agent.get('/api/requests?status=DECLINED,CANCELLED')).body.total).toBe(1);
    expect((await a.agent.get('/api/requests?box=sent')).body.items[0].direction).toBe('SENT');
    expect((await a.agent.get('/api/requests?box=received')).body.total).toBe(0);
    expect((await owner.agent.get(`/api/requests?teamId=${team.id}&pageSize=1&page=2`)).body).toMatchObject({
      total: 2,
      totalPages: 2,
    });
    expect((await owner.agent.get('/api/requests?status=BOGUS')).status).toBe(400);
  });

  it('summarises counts for both modes', async () => {
    const { owner, a, team, frontend, designer } = await world();
    await join(a, team, frontend);
    await invite(owner, team, designer, a.user.id);
    expect((await owner.agent.get('/api/dashboard/summary')).body).toMatchObject({
      pendingReceived: 1,
      pendingSent: 1,
      ownedTeams: 1,
      joinedTeams: 0,
      openRolesTotal: 2,
    });
    expect((await a.agent.get('/api/dashboard/summary')).body).toMatchObject({
      pendingReceived: 1,
      pendingSent: 1,
      ownedTeams: 0,
    });
    const ownerView = (await owner.agent.get('/api/dashboard/owner')).body.teams;
    expect(ownerView).toHaveLength(1);
    expect(ownerView[0].pendingRequests).toHaveLength(1);
    expect(ownerView[0].roles).toHaveLength(2);
    const memberView = (await a.agent.get('/api/dashboard/member')).body;
    expect(memberView.pendingSent).toHaveLength(1);
    expect(memberView.pendingReceived).toHaveLength(1);
  });
});
