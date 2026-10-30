import { beforeEach, describe, expect, it } from 'vitest';
import { createProfile, createTeam, createUser, resetDb } from './helpers.js';
import { prisma } from '../lib/prisma.js';

beforeEach(resetDb);

async function world() {
  const owner = await createUser({ name: 'Olive Owner' });
  const a = await createUser({ name: 'Ann' });
  const b = await createUser({ name: 'Ben' });
  for (const u of [a, b]) await createProfile(u.agent);
  const team = await createTeam(owner.agent, {
    name: 'Alpha',
    roles: [
      { title: 'Frontend', slots: 2, requiredSkillNames: ['React'] },
      { title: 'Designer', slots: 1 },
    ],
  });
  return { owner, a, b, team, frontend: team.roles[0].id, designer: team.roles[1].id };
}

const join = (u, team, roleId) => u.agent.post('/api/requests/join').send({ teamId: team.id, roleId });
const accept = async (owner, req) => owner.agent.post(`/api/requests/${req.body.id}/accept`);
const base = (team, roleId) => `/api/teams/${team.id}/roles/${roleId}`;
const browseNames = async (u) => (await u.agent.get('/api/teams')).body.items.map((t) => t.name);

describe('mark filled', () => {
  it('fills the role, cancels pending requests and notifies their senders', async () => {
    const { owner, a, b, team, designer } = await world();
    await join(a, team, designer);
    await owner.agent.post('/api/requests/invite').send({ teamId: team.id, roleId: designer, userId: b.user.id });
    const res = await owner.agent.post(`${base(team, designer)}/mark-filled`);
    expect(res.status).toBe(200);
    expect(res.body.roles[1]).toMatchObject({ filled: 1, open: 0 });
    expect(await prisma.request.count({ where: { roleId: designer, status: 'CANCELLED' } })).toBe(2);
    expect((await a.agent.get('/api/notifications')).body.items[0]).toMatchObject({ type: 'REQUEST_CANCELLED' });
    expect((await b.agent.get('/api/notifications')).body.items[0]).toMatchObject({ type: 'REQUEST_CANCELLED' });
    expect(res.body.status).toBe('OPEN');
  });

  it('closes the team when every role is filled, hides it from browse and notifies; reopen restores it', async () => {
    const { owner, a, team, frontend, designer } = await world();
    expect(await browseNames(a)).toEqual(['Alpha']);
    await owner.agent.post(`${base(team, frontend)}/mark-filled`);
    const closed = await owner.agent.post(`${base(team, designer)}/mark-filled`);
    expect(closed.body.status).toBe('CLOSED');
    expect(await browseNames(a)).toEqual([]);
    expect((await owner.agent.get('/api/notifications')).body.items.some((n) => n.type === 'TEAM_CLOSED')).toBe(true);
    expect((await a.agent.get('/api/teams?includeClosed=true')).body.items.map((t) => t.name)).toEqual(['Alpha']);

    const reopened = await owner.agent.post(`${base(team, designer)}/reopen`);
    expect(reopened.status).toBe(200);
    expect(reopened.body).toMatchObject({ status: 'OPEN' });
    expect(reopened.body.roles[1]).toMatchObject({ filled: 0, open: 1 });
    expect(await browseNames(a)).toEqual(['Alpha']);
  });

  it('is idempotent, owner-only and validates the role', async () => {
    const { owner, a, team, frontend } = await world();
    expect((await a.agent.post(`${base(team, frontend)}/mark-filled`)).status).toBe(403);
    expect((await a.agent.post(`${base(team, frontend)}/reopen`)).status).toBe(403);
    expect((await owner.agent.post(`${base(team, 'missing')}/mark-filled`)).status).toBe(404);
    expect((await owner.agent.post(`${base(team, frontend)}/mark-filled`)).status).toBe(200);
    expect((await owner.agent.post(`${base(team, frontend)}/mark-filled`)).body.roles[0].filled).toBe(2);
  });

  it('never changes an archived team automatically', async () => {
    const { owner, team, frontend, designer } = await world();
    await owner.agent.patch(`/api/teams/${team.id}`).send({ status: 'ARCHIVED' });
    await owner.agent.post(`${base(team, frontend)}/mark-filled`);
    const res = await owner.agent.post(`${base(team, designer)}/mark-filled`);
    expect(res.body.status).toBe('ARCHIVED');
    const unarchived = await owner.agent.patch(`/api/teams/${team.id}`).send({ status: 'OPEN' });
    expect(unarchived.body.status).toBe('CLOSED');
  });
});

describe('reopen with real members', () => {
  it('resets filled to the number of assigned members and refuses when every slot has a member', async () => {
    const { owner, a, team, frontend, designer } = await world();
    await accept(owner, await join(a, team, designer));
    expect((await owner.agent.post(`${base(team, designer)}/reopen`)).status).toBe(409);
    await owner.agent.post(`${base(team, frontend)}/mark-filled`);
    const res = await owner.agent.post(`${base(team, frontend)}/reopen`);
    expect(res.body.roles[0]).toMatchObject({ filled: 0, open: 2 });
  });
});

describe('remove member and leave', () => {
  it('removes a member, decrements filled, reopens the team and notifies the removed user', async () => {
    const { owner, a, b, team, frontend, designer } = await world();
    await accept(owner, await join(a, team, designer));
    await owner.agent.post(`${base(team, frontend)}/mark-filled`);
    expect((await owner.agent.get(`/api/teams/${team.id}`)).body.status).toBe('CLOSED');

    const res = await owner.agent.delete(`/api/teams/${team.id}/members/${a.user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'OPEN', memberCount: 1 });
    expect(res.body.roles[1]).toMatchObject({ filled: 0, open: 1 });
    expect((await a.agent.get('/api/notifications')).body.items[0]).toMatchObject({
      type: 'MEMBER_REMOVED',
      body: 'You were removed from Alpha',
    });
    expect((await a.agent.get(`/api/teams/${team.id}`)).body.myRelation).toBe('NONE');
    expect((await b.agent.delete(`/api/teams/${team.id}/members/${a.user.id}`)).status).toBe(403);
  });

  it('cannot remove the owner or a non-member', async () => {
    const { owner, a, team } = await world();
    expect((await owner.agent.delete(`/api/teams/${team.id}/members/${owner.user.id}`)).status).toBe(400);
    expect((await owner.agent.delete(`/api/teams/${team.id}/members/${a.user.id}`)).status).toBe(404);
  });

  it('lets a member leave, freeing the slot and telling the owner; the owner cannot leave', async () => {
    const { owner, a, team, designer } = await world();
    await accept(owner, await join(a, team, designer));
    expect((await a.agent.post(`/api/teams/${team.id}/leave`)).status).toBe(204);
    const dto = (await owner.agent.get(`/api/teams/${team.id}`)).body;
    expect(dto.roles[1]).toMatchObject({ filled: 0, open: 1 });
    expect(dto.members).toHaveLength(1);
    expect((await owner.agent.get('/api/notifications')).body.items[0]).toMatchObject({
      type: 'MEMBER_REMOVED',
      title: 'A member left',
    });
    expect((await owner.agent.post(`/api/teams/${team.id}/leave`)).status).toBe(400);
    expect((await a.agent.post(`/api/teams/${team.id}/leave`)).status).toBe(404);
  });

  it('notifies members when a team is deleted', async () => {
    const { owner, a, team, designer } = await world();
    await accept(owner, await join(a, team, designer));
    await owner.agent.delete(`/api/teams/${team.id}`);
    expect((await a.agent.get('/api/notifications')).body.items[0]).toMatchObject({ title: 'Team deleted' });
  });
});
