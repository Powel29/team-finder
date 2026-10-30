import { beforeEach, describe, expect, it } from 'vitest';
import { createTeam, createUser, resetDb } from './helpers.js';
import { prisma } from '../lib/prisma.js';
import { recomputeTeamStatus } from '../modules/teams/team-status.js';

beforeEach(resetDb);

describe('create team', () => {
  it('creates the team, its roles and the owner membership', async () => {
    const { agent, user } = await createUser({ name: 'Olivia' });
    const team = await createTeam(agent, {
      roles: [
        { title: 'Frontend', slots: 2, requiredSkillNames: ['React'], niceToHaveSkillNames: ['Tailwind', 'React'] },
        { title: 'Backend', slots: 1, requiredSkillNames: ['Node'], minLevel: 'INTERMEDIATE', minHoursPerWeek: 6 },
        { title: 'Designer', slots: 1 },
      ],
    });
    expect(team).toMatchObject({
      name: 'Test Team',
      status: 'OPEN',
      myRelation: 'OWNER',
      memberCount: 1,
      openSlots: 4,
    });
    expect(team.owner).toEqual({ id: user.id, name: 'Olivia' });
    expect(team.members).toEqual([{ userId: user.id, name: 'Olivia', roleTitle: null, isOwner: true }]);
    expect(team.roles.map((r) => r.title)).toEqual(['Frontend', 'Backend', 'Designer']);
    expect(team.roles[0].requiredSkills.map((s) => s.name)).toEqual(['React']);
    expect(team.roles[0].niceToHaveSkills.map((s) => s.name)).toEqual(['Tailwind']);
    expect(team.roles[1]).toMatchObject({ minLevel: 'INTERMEDIATE', minHoursPerWeek: 6 });
    expect(JSON.stringify(team)).not.toMatch(/email|passwordHash/);
  });

  it('validates input', async () => {
    const { agent } = await createUser();
    const res = await agent.post('/api/teams').send({ name: '', idea: 'x', type: 'NOPE', teamSize: 1, roles: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.path)).toEqual(
      expect.arrayContaining(['name', 'type', 'teamSize', 'roles']),
    );
    const badSlots = await agent
      .post('/api/teams')
      .send({ name: 'T', idea: 'x', type: 'STARTUP', teamSize: 3, roles: [{ title: 'A', slots: 11 }] });
    expect(badSlots.status).toBe(400);
  });

  it('requires auth', async () => {
    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    expect((await request(app).post('/api/teams').send({})).status).toBe(401);
  });
});

describe('ownership', () => {
  it('forbids non-owners from editing or deleting', async () => {
    const owner = await createUser();
    const other = await createUser();
    const team = await createTeam(owner.agent);
    expect((await other.agent.patch(`/api/teams/${team.id}`).send({ name: 'Hijack' })).status).toBe(403);
    expect((await other.agent.delete(`/api/teams/${team.id}`)).status).toBe(403);
    expect((await other.agent.post(`/api/teams/${team.id}/roles`).send({ title: 'X', slots: 1 })).status).toBe(403);
    expect((await other.agent.patch(`/api/teams/${team.id}/roles/${team.roles[0].id}`).send({ slots: 3 })).status).toBe(
      403,
    );
    expect((await other.agent.delete(`/api/teams/${team.id}/roles/${team.roles[0].id}`)).status).toBe(403);
    expect((await owner.agent.patch(`/api/teams/${team.id}`).send({ name: 'Renamed' })).body.name).toBe('Renamed');
  });

  it('returns 404 for unknown teams', async () => {
    const { agent } = await createUser();
    expect((await agent.get('/api/teams/does-not-exist')).status).toBe(404);
  });

  it('lists owned and joined teams separately', async () => {
    const owner = await createUser();
    const member = await createUser();
    const team = await createTeam(owner.agent);
    await prisma.teamMember.create({ data: { teamId: team.id, userId: member.user.id, roleId: team.roles[0].id } });
    await createTeam(member.agent, { name: 'Mine' });
    const mine = (await member.agent.get('/api/teams/mine')).body;
    expect(mine.owned.map((t) => t.name)).toEqual(['Mine']);
    expect(mine.joined.map((t) => t.name)).toEqual(['Test Team']);
    expect(mine.joined[0].myRelation).toBe('MEMBER');
  });

  it('deletes a team with cascade', async () => {
    const { agent } = await createUser();
    const team = await createTeam(agent);
    expect((await agent.delete(`/api/teams/${team.id}`)).status).toBe(204);
    expect((await agent.get(`/api/teams/${team.id}`)).status).toBe(404);
    expect(await prisma.role.count()).toBe(0);
  });
});

describe('roles', () => {
  it('adds, edits and deletes roles', async () => {
    const { agent } = await createUser();
    const team = await createTeam(agent);
    const added = (
      await agent
        .post(`/api/teams/${team.id}/roles`)
        .send({ title: 'Designer', slots: 1, requiredSkillNames: ['Figma'] })
    ).body;
    expect(added.roles).toHaveLength(2);
    const designer = added.roles[1];
    const edited = (
      await agent
        .patch(`/api/teams/${team.id}/roles/${designer.id}`)
        .send({ slots: 3, requiredSkillNames: ['Figma', 'UI/UX Design'] })
    ).body;
    expect(edited.roles[1]).toMatchObject({ slots: 3, open: 3 });
    expect(edited.roles[1].requiredSkills).toHaveLength(2);
    const removed = await agent.delete(`/api/teams/${team.id}/roles/${designer.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.roles).toHaveLength(1);
  });

  it('rejects slots below the filled count and deleting roles that have members', async () => {
    const { agent } = await createUser();
    const team = await createTeam(agent, {
      roles: [
        { title: 'A', slots: 3 },
        { title: 'B', slots: 1 },
      ],
    });
    await prisma.role.update({ where: { id: team.roles[0].id }, data: { filled: 2 } });
    const low = await agent.patch(`/api/teams/${team.id}/roles/${team.roles[0].id}`).send({ slots: 1 });
    expect(low.status).toBe(409);
    expect(low.body.error.code).toBe('SLOTS_BELOW_FILLED');
    const del = await agent.delete(`/api/teams/${team.id}/roles/${team.roles[0].id}`);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('ROLE_HAS_MEMBERS');
  });

  it('refuses to delete the last role', async () => {
    const { agent } = await createUser();
    const team = await createTeam(agent);
    expect((await agent.delete(`/api/teams/${team.id}/roles/${team.roles[0].id}`)).status).toBe(400);
  });
});

describe('recomputeTeamStatus', () => {
  const setup = async () => {
    const { agent } = await createUser();
    return createTeam(agent, {
      roles: [
        { title: 'A', slots: 1 },
        { title: 'B', slots: 2 },
      ],
    });
  };
  const run = (teamId) => prisma.$transaction((tx) => recomputeTeamStatus(tx, teamId));

  it('closes when every role is filled and reopens when one is not', async () => {
    const team = await setup();
    await prisma.role.updateMany({ where: { teamId: team.id }, data: { filled: 1 } });
    expect(await run(team.id)).toEqual({ previous: 'OPEN', current: 'OPEN' });
    await prisma.role.update({ where: { id: team.roles[1].id }, data: { filled: 2 } });
    expect(await run(team.id)).toEqual({ previous: 'OPEN', current: 'CLOSED' });
    await prisma.role.update({ where: { id: team.roles[1].id }, data: { filled: 1 } });
    expect(await run(team.id)).toEqual({ previous: 'CLOSED', current: 'OPEN' });
  });

  it('never changes an archived team', async () => {
    const team = await setup();
    await prisma.team.update({ where: { id: team.id }, data: { status: 'ARCHIVED' } });
    await prisma.role.updateMany({ where: { teamId: team.id }, data: { filled: 5 } });
    expect(await run(team.id)).toEqual({ previous: 'ARCHIVED', current: 'ARCHIVED' });
  });
});
