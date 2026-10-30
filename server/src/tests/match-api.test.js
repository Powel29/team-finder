import { beforeEach, describe, expect, it } from 'vitest';
import { createProfile, createTeam, createUser, resetDb } from './helpers.js';

beforeEach(resetDb);

async function scenario() {
  const owner = await createUser({ name: 'Olive' });
  const member = await createUser({ name: 'Mo' });
  const stranger = await createUser({ name: 'Sam' });
  const team = await createTeam(owner.agent, {
    roles: [
      {
        title: 'Frontend',
        slots: 1,
        requiredSkillNames: ['React', 'TypeScript'],
        niceToHaveSkillNames: ['Tailwind CSS'],
        minLevel: 'INTERMEDIATE',
        minHoursPerWeek: 10,
      },
    ],
  });
  await createProfile(member.agent, {
    skillNames: ['ReactJS', 'Tailwind'],
    experienceLevel: 'BEGINNER',
    availabilityHrs: 5,
    lookingFor: ['HACKATHON'],
  });
  return { owner, member, stranger, team, roleId: team.roles[0].id };
}

describe('GET /api/match', () => {
  it('lets a member score themselves and returns names, breakdown and missing skills', async () => {
    const { member, roleId } = await scenario();
    const res = await member.agent.get(`/api/match?roleId=${roleId}`);
    expect(res.status).toBe(200);
    // skills (3+1)/(6+1)=57, level 50 (beginner vs intermediate), hours 50, type 100
    expect(res.body.breakdown).toEqual({ skills: 57, level: 50, availability: 50, type: 100 });
    expect(res.body.score).toBe(59);
    expect(res.body.matchedSkills).toEqual(['React', 'Tailwind CSS']);
    expect(res.body.missingSkills).toEqual(['TypeScript']);
  });

  it('lets the team owner score a member but not a stranger', async () => {
    const { owner, member, stranger, roleId } = await scenario();
    expect((await owner.agent.get(`/api/match?roleId=${roleId}&userId=${member.user.id}`)).status).toBe(200);
    expect((await stranger.agent.get(`/api/match?roleId=${roleId}&userId=${member.user.id}`)).status).toBe(403);
  });

  it('requires a profile and a valid role', async () => {
    const { stranger, roleId } = await scenario();
    const noProfile = await stranger.agent.get(`/api/match?roleId=${roleId}`);
    expect(noProfile.status).toBe(400);
    expect(noProfile.body.error.code).toBe('PROFILE_REQUIRED');
    expect((await stranger.agent.get('/api/match?roleId=missing')).status).toBe(404);
    expect((await stranger.agent.get('/api/match')).status).toBe(400);
  });

  it('recomputes after the profile changes', async () => {
    const { member, roleId } = await scenario();
    const before = (await member.agent.get(`/api/match?roleId=${roleId}`)).body.score;
    await createProfile(member.agent, {
      skillNames: ['React', 'TypeScript', 'Tailwind CSS'],
      experienceLevel: 'ADVANCED',
      availabilityHrs: 20,
    });
    const after = (await member.agent.get(`/api/match?roleId=${roleId}`)).body.score;
    expect(after).toBe(100);
    expect(after).toBeGreaterThan(before);
  });
});

describe('team and member DTO integration', () => {
  it('adds role matches to the team DTO for a viewer with a profile, but not for the owner', async () => {
    const { owner, member, stranger, team } = await scenario();
    const asMember = (await member.agent.get(`/api/teams/${team.id}`)).body;
    expect(asMember.roles[0].match.score).toBe(59);
    expect((await owner.agent.get(`/api/teams/${team.id}`)).body.roles[0].match).toBeUndefined();
    expect((await stranger.agent.get(`/api/teams/${team.id}`)).body.roles[0].match).toBeUndefined();
  });

  it('adds a match to a member profile only for the role owner', async () => {
    const { owner, member, stranger, roleId } = await scenario();
    const res = await owner.agent.get(`/api/members/${member.user.id}?roleId=${roleId}`);
    expect(res.body.match.score).toBe(59);
    expect(res.body.email).toBeUndefined();
    expect((await stranger.agent.get(`/api/members/${member.user.id}?roleId=${roleId}`)).status).toBe(403);
    expect((await stranger.agent.get(`/api/members/${member.user.id}`)).body.match).toBeUndefined();
  });

  it('hides non-discoverable profiles from strangers', async () => {
    const { member, stranger } = await scenario();
    await createProfile(member.agent, { isDiscoverable: false });
    expect((await stranger.agent.get(`/api/members/${member.user.id}`)).status).toBe(404);
    expect((await member.agent.get(`/api/members/${member.user.id}`)).status).toBe(200);
  });
});

describe('recommendations', () => {
  it('ranks people for a role (owner only) and skips low scores', async () => {
    const { owner, member, stranger, roleId } = await scenario();
    const strong = await createUser({ name: 'Strong' });
    await createProfile(strong.agent, {
      skillNames: ['React', 'TypeScript', 'Tailwind CSS'],
      experienceLevel: 'ADVANCED',
      availabilityHrs: 20,
    });
    const weak = await createUser({ name: 'Weak' });
    await createProfile(weak.agent, { skillNames: ['Python'], lookingFor: ['STARTUP'] });
    const res = await owner.agent.get(`/api/match/recommendations/members?roleId=${roleId}`);
    expect(res.status).toBe(200);
    // the beginner (5h) fails the min-hours pre-filter, so only the strong candidate remains
    expect(res.body.items.map((m) => m.name)).toEqual(['Strong']);
    expect(res.body.items[0].match.score).toBe(100);
    expect(res.body.items[0].email).toBeUndefined();
    expect((await member.agent.get(`/api/match/recommendations/members?roleId=${roleId}`)).status).toBe(403);
    expect((await stranger.agent.get(`/api/match/recommendations/members?roleId=${roleId}`)).status).toBe(403);
  });

  it('recommends open teams for a member, best role first, excluding own teams', async () => {
    const { member, team } = await scenario();
    const other = await createUser();
    await createTeam(other.agent, {
      name: 'Python Club',
      techStackNames: ['Python'],
      type: 'STARTUP',
      roles: [{ title: 'Data', slots: 1, requiredSkillNames: ['Python'], minLevel: 'ADVANCED', minHoursPerWeek: 30 }],
    });
    await createTeam(member.agent, {
      name: 'My Own',
      roles: [{ title: 'Any', slots: 1, requiredSkillNames: ['React'] }],
    });
    const res = await member.agent.get('/api/match/recommendations/teams');
    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => i.team.id)).toEqual([team.id]);
    expect(res.body.items[0]).toMatchObject({ role: { title: 'Frontend' }, match: { score: 59 } });
  });
});
