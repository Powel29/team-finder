import { beforeEach, describe, expect, it } from 'vitest';
import { createProfile, createTeam, createUser, resetDb, skill } from './helpers.js';
import { prisma } from '../lib/prisma.js';

beforeEach(resetDb);

async function people() {
  const viewer = await createUser({ name: 'Viewer' });
  const mk = async (name, profile) => {
    const u = await createUser({ name });
    await createProfile(u.agent, profile);
    return u;
  };
  const ann = await mk('Ann Frontend', {
    headline: 'React wizard',
    skillNames: ['React', 'TypeScript'],
    experienceLevel: 'ADVANCED',
    availabilityHrs: 20,
    lookingFor: ['HACKATHON'],
  });
  const bob = await mk('Bob Backend', {
    headline: 'Node person',
    skillNames: ['Node.js', 'PostgreSQL', 'React'],
    experienceLevel: 'INTERMEDIATE',
    availabilityHrs: 8,
    lookingFor: ['STARTUP'],
  });
  const cy = await mk('Cy Newbie', {
    headline: 'Learning',
    skillNames: ['HTML/CSS'],
    experienceLevel: 'BEGINNER',
    availabilityHrs: 3,
    lookingFor: ['COURSE_PROJECT', 'HACKATHON'],
  });
  const hidden = await mk('Hidden Hank', { skillNames: ['React'], isDiscoverable: false });
  return { viewer, ann, bob, cy, hidden };
}
const names = (res) => res.body.items.map((i) => i.name).sort();

describe('GET /api/members', () => {
  it('excludes self and non-discoverable profiles, with pagination metadata', async () => {
    const { viewer } = await people();
    await createProfile(viewer.agent);
    const res = await viewer.agent.get('/api/members');
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(['Ann Frontend', 'Bob Backend', 'Cy Newbie']);
    expect(res.body).toMatchObject({ page: 1, pageSize: 12, total: 3, totalPages: 1 });
    expect(JSON.stringify(res.body)).not.toMatch(/email|passwordHash/);
  });

  it('filters by skills in any and all mode', async () => {
    const { viewer } = await people();
    const react = (await skill(viewer.agent, 'React')).id;
    const ts = (await skill(viewer.agent, 'TypeScript')).id;
    expect(names(await viewer.agent.get(`/api/members?skills=${react}`))).toEqual(['Ann Frontend', 'Bob Backend']);
    expect(names(await viewer.agent.get(`/api/members?skills=${react},${ts}&skillMode=any`))).toEqual([
      'Ann Frontend',
      'Bob Backend',
    ]);
    expect(names(await viewer.agent.get(`/api/members?skills=${react},${ts}&skillMode=all`))).toEqual(['Ann Frontend']);
  });

  it('filters by level, minimum hours, looking-for and text, and combines them', async () => {
    const { viewer } = await people();
    expect(names(await viewer.agent.get('/api/members?level=ADVANCED,BEGINNER'))).toEqual([
      'Ann Frontend',
      'Cy Newbie',
    ]);
    expect(names(await viewer.agent.get('/api/members?minHours=8'))).toEqual(['Ann Frontend', 'Bob Backend']);
    expect(names(await viewer.agent.get('/api/members?lookingFor=HACKATHON'))).toEqual(['Ann Frontend', 'Cy Newbie']);
    expect(names(await viewer.agent.get('/api/members?q=node'))).toEqual(['Bob Backend']);
    expect(names(await viewer.agent.get('/api/members?q=ANN'))).toEqual(['Ann Frontend']);
    expect(names(await viewer.agent.get('/api/members?lookingFor=HACKATHON&minHours=10&level=ADVANCED'))).toEqual([
      'Ann Frontend',
    ]);
    expect(names(await viewer.agent.get('/api/members?q=zzz'))).toEqual([]);
  });

  it('paginates with correct totals', async () => {
    const { viewer } = await people();
    const page1 = await viewer.agent.get('/api/members?pageSize=2&page=1');
    const page2 = await viewer.agent.get('/api/members?pageSize=2&page=2');
    expect(page1.body).toMatchObject({ total: 3, totalPages: 2 });
    expect(page1.body.items).toHaveLength(2);
    expect(page2.body.items).toHaveLength(1);
    const seen = [...page1.body.items, ...page2.body.items].map((i) => i.userId);
    expect(new Set(seen).size).toBe(3);
  });

  it('rejects invalid filters', async () => {
    const { viewer } = await people();
    expect((await viewer.agent.get('/api/members?level=GURU')).status).toBe(400);
    expect((await viewer.agent.get('/api/members?pageSize=500')).status).toBe(400);
  });

  it('ranks by match for a role the viewer owns, and refuses other roles', async () => {
    const { viewer, ann, bob } = await people();
    const team = await createTeam(viewer.agent, {
      roles: [{ title: 'Frontend', slots: 1, requiredSkillNames: ['React', 'TypeScript'], minLevel: 'INTERMEDIATE' }],
    });
    const roleId = team.roles[0].id;
    const res = await viewer.agent.get(`/api/members?roleId=${roleId}&sort=match`);
    expect(res.body.items.map((i) => i.userId)).toEqual([ann.user.id, bob.user.id, expect.any(String)]);
    expect(res.body.items[0].match.score).toBeGreaterThan(res.body.items[1].match.score);
    const recent = await viewer.agent.get(`/api/members?roleId=${roleId}`);
    expect(recent.body.items.every((i) => typeof i.match.score === 'number')).toBe(true);
    expect((await ann.agent.get(`/api/members?roleId=${roleId}&sort=match`)).status).toBe(403);
    expect((await viewer.agent.get('/api/members?sort=match')).body.items).toHaveLength(3);
  });

  it('requires auth', async () => {
    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    expect((await request(app).get('/api/members')).status).toBe(401);
  });
});

async function teamsFixture() {
  const viewer = await createUser({ name: 'Viewer' });
  const owner = await createUser({ name: 'Owner' });
  await createProfile(viewer.agent, {
    skillNames: ['React', 'TypeScript'],
    experienceLevel: 'ADVANCED',
    availabilityHrs: 20,
  });
  const soon = new Date(Date.now() + 5 * 86400000).toISOString();
  const later = new Date(Date.now() + 40 * 86400000).toISOString();
  const a = await createTeam(owner.agent, {
    name: 'Alpha Web',
    idea: 'A climate dashboard',
    type: 'HACKATHON',
    deadline: later,
    techStackNames: ['React'],
    roles: [{ title: 'Frontend', slots: 1, requiredSkillNames: ['React', 'TypeScript'] }],
  });
  const b = await createTeam(owner.agent, {
    name: 'Beta Data',
    idea: 'Data science club',
    type: 'STARTUP',
    deadline: soon,
    techStackNames: ['Python'],
    roles: [{ title: 'Analyst', slots: 1, requiredSkillNames: ['Python', 'Pandas'] }],
  });
  const c = await createTeam(owner.agent, {
    name: 'Gamma OSS',
    idea: 'A CLI tool',
    type: 'OPEN_SOURCE',
    techStackNames: ['Rust'],
    roles: [{ title: 'Rust Dev', slots: 2, requiredSkillNames: ['Rust'] }],
  });
  const closed = await createTeam(owner.agent, {
    name: 'Delta Closed',
    idea: 'Done team',
    techStackNames: ['React'],
    roles: [{ title: 'Only', slots: 1, requiredSkillNames: ['React'] }],
  });
  await prisma.role.updateMany({ where: { teamId: closed.id }, data: { filled: 1 } });
  await prisma.team.update({ where: { id: closed.id }, data: { status: 'CLOSED' } });
  const archived = await createTeam(owner.agent, { name: 'Echo Archived', roles: [{ title: 'X', slots: 1 }] });
  await prisma.team.update({ where: { id: archived.id }, data: { status: 'ARCHIVED' } });
  return { viewer, owner, a, b, c, closed };
}
const teamNames = (res) => res.body.items.map((t) => t.name);

describe('GET /api/teams', () => {
  it('lists only open teams with open slots by default, and includes closed on request', async () => {
    const { viewer } = await teamsFixture();
    const res = await viewer.agent.get('/api/teams?sort=deadline');
    expect(teamNames(res).sort()).toEqual(['Alpha Web', 'Beta Data', 'Gamma OSS']);
    expect(res.body.total).toBe(3);
    const all = await viewer.agent.get('/api/teams?includeClosed=true');
    expect(teamNames(all).sort()).toEqual(['Alpha Web', 'Beta Data', 'Delta Closed', 'Gamma OSS']);
  });

  it('filters by stack, role skill, type, deadline and text', async () => {
    const { viewer } = await teamsFixture();
    const react = (await skill(viewer.agent, 'React')).id;
    const python = (await skill(viewer.agent, 'Python')).id;
    const pandas = (await skill(viewer.agent, 'Pandas')).id;
    expect(teamNames(await viewer.agent.get(`/api/teams?stack=${react}`))).toEqual(['Alpha Web']);
    expect(teamNames(await viewer.agent.get(`/api/teams?stack=${react},${python}`)).sort()).toEqual([
      'Alpha Web',
      'Beta Data',
    ]);
    expect(teamNames(await viewer.agent.get(`/api/teams?roleSkill=${pandas}`))).toEqual(['Beta Data']);
    expect(teamNames(await viewer.agent.get('/api/teams?type=STARTUP,OPEN_SOURCE')).sort()).toEqual([
      'Beta Data',
      'Gamma OSS',
    ]);
    const cutoff = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(teamNames(await viewer.agent.get(`/api/teams?deadlineBefore=${encodeURIComponent(cutoff)}`))).toEqual([
      'Beta Data',
    ]);
    expect(teamNames(await viewer.agent.get('/api/teams?q=climate'))).toEqual(['Alpha Web']);
    expect(teamNames(await viewer.agent.get(`/api/teams?q=data&type=STARTUP&stack=${python}`))).toEqual(['Beta Data']);
  });

  it('sorts by deadline with nulls last, and by match with the viewer profile', async () => {
    const { viewer } = await teamsFixture();
    expect(teamNames(await viewer.agent.get('/api/teams?sort=deadline'))).toEqual([
      'Beta Data',
      'Alpha Web',
      'Gamma OSS',
    ]);
    const byMatch = await viewer.agent.get('/api/teams?sort=match');
    expect(teamNames(byMatch)[0]).toBe('Alpha Web');
    expect(byMatch.body.items[0].bestMatch).toMatchObject({ roleTitle: 'Frontend' });
    expect(byMatch.body.items[0].bestMatch.score).toBeGreaterThan(byMatch.body.items[1].bestMatch.score);
  });

  it('paginates and decorates with the viewer relation', async () => {
    const { viewer, owner } = await teamsFixture();
    const res = await viewer.agent.get('/api/teams?pageSize=2&page=2&sort=deadline');
    expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(res.body.items).toHaveLength(1);
    expect((await viewer.agent.get('/api/teams')).body.items.every((t) => t.myRelation === 'NONE')).toBe(true);
    expect((await owner.agent.get('/api/teams')).body.items.every((t) => t.myRelation === 'OWNER')).toBe(true);
  });

  it('hides closed teams again after reopening a role', async () => {
    const { viewer, owner, closed } = await teamsFixture();
    expect(teamNames(await viewer.agent.get('/api/teams'))).not.toContain('Delta Closed');
    await prisma.role.updateMany({ where: { teamId: closed.id }, data: { filled: 0 } });
    await prisma.team.update({ where: { id: closed.id }, data: { status: 'OPEN' } });
    expect(teamNames(await viewer.agent.get('/api/teams'))).toContain('Delta Closed');
    expect(owner).toBeTruthy();
  });

  it('rejects invalid filters', async () => {
    const { viewer } = await teamsFixture();
    expect((await viewer.agent.get('/api/teams?type=NOPE')).status).toBe(400);
    expect((await viewer.agent.get('/api/teams?deadlineBefore=banana')).status).toBe(400);
  });
});

describe('public endpoints', () => {
  it('serves featured teams and stats without auth or private data', async () => {
    await teamsFixture();
    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    const featured = await request(app).get('/api/public/featured-teams');
    expect(featured.status).toBe(200);
    expect(featured.body.items.map((t) => t.name).sort()).toEqual(['Alpha Web', 'Beta Data', 'Gamma OSS']);
    expect(Object.keys(featured.body.items[0]).sort()).toEqual(['id', 'name', 'openSlots', 'techStack', 'type']);
    const stats = await request(app).get('/api/public/stats');
    expect(stats.body).toEqual({ members: 1, openTeams: 3, openRoles: 3 });
  });
});

describe('GET /api/skills?ids=', () => {
  it('returns the requested skills for hydrating filter chips', async () => {
    const { agent } = await createUser();
    const a = await skill(agent, 'Rust');
    await skill(agent, 'Go');
    const res = await agent.get(`/api/skills?ids=${a.id}`);
    expect(res.body.items).toEqual([{ id: a.id, name: 'Rust' }]);
  });
});
