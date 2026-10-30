import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, resetDb } from './helpers.js';
import { computeCompleteness } from '../modules/members/members.dto.js';

beforeEach(resetDb);

const profileBody = (extra = {}) => ({
  headline: 'Full-stack student',
  bio: 'I like hackathons.',
  skillNames: ['ReactJS', 'react', 'Node'],
  experienceLevel: 'INTERMEDIATE',
  availabilityHrs: 10,
  interests: ['AI'],
  lookingFor: ['HACKATHON'],
  isDiscoverable: true,
  ...extra,
});

describe('skills', () => {
  it('normalises aliases so duplicates collapse, and creation is idempotent', async () => {
    const { agent } = await createUser();
    const a = await agent.post('/api/skills').send({ name: 'ReactJS' });
    const b = await agent.post('/api/skills').send({ name: 'react' });
    const c = await agent.post('/api/skills').send({ name: '  React.js ' });
    expect(a.status).toBe(201);
    expect(b.body.id).toBe(a.body.id);
    expect(c.body.id).toBe(a.body.id);
    const list = await agent.get('/api/skills?q=reac');
    expect(list.body.items).toHaveLength(1);
  });

  it('requires auth to create but not to list', async () => {
    const { agent } = await createUser();
    await agent.post('/api/skills').send({ name: 'Rust' });
    const request = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    expect((await request(app).get('/api/skills')).body.items).toHaveLength(1);
    expect((await request(app).post('/api/skills').send({ name: 'Go' })).status).toBe(401);
  });
});

describe('member profile', () => {
  it('returns 404 before the profile exists, then upserts and dedupes skills', async () => {
    const { agent, user } = await createUser();
    expect((await agent.get('/api/members/me')).status).toBe(404);
    const res = await agent.put('/api/members/me').send(profileBody({ name: 'Renamed' }));
    expect(res.status).toBe(200);
    expect(res.body.skills.map((s) => s.name).sort()).toEqual(['Node', 'ReactJS']);
    expect(res.body).toMatchObject({ userId: user.id, name: 'Renamed', completeness: 85 });
    expect(res.body.email).toBeUndefined();
    const again = await agent.put('/api/members/me').send(profileBody({ skillNames: [], headline: 'Updated' }));
    expect(again.body.headline).toBe('Updated');
    expect(again.body.skills).toHaveLength(0);
    expect((await agent.get('/api/auth/me')).body.hasMemberProfile).toBe(true);
  });

  it('validates urls and hours', async () => {
    const { agent } = await createUser();
    const res = await agent
      .put('/api/members/me')
      .send(
        profileBody({ githubUrl: 'https://gitlab.com/x', portfolioUrl: 'javascript:alert(1)', availabilityHrs: 99 }),
      );
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.path).sort()).toEqual(['availabilityHrs', 'githubUrl', 'portfolioUrl']);
  });

  it('treats empty url strings as absent', async () => {
    const { agent } = await createUser();
    const res = await agent.put('/api/members/me').send(profileBody({ githubUrl: '', portfolioUrl: '' }));
    expect(res.status).toBe(200);
    expect(res.body.githubUrl).toBeNull();
  });
});

describe('completeness', () => {
  it('scores filled-in fields', () => {
    const empty = {
      headline: '',
      bio: '',
      skills: [],
      interests: [],
      lookingFor: [],
      githubUrl: null,
      portfolioUrl: null,
      availabilityHrs: 0,
    };
    expect(computeCompleteness(empty)).toBe(0);
    expect(computeCompleteness({ ...empty, headline: 'x', skills: [1] })).toBe(35);
    expect(
      computeCompleteness({
        headline: 'x',
        bio: 'y',
        skills: [1],
        interests: ['a'],
        lookingFor: ['STARTUP'],
        githubUrl: 'https://github.com/a',
        availabilityHrs: 5,
      }),
    ).toBe(100);
  });
});
