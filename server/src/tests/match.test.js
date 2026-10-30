import { describe, expect, it } from 'vitest';
import { computeMatch } from '../lib/match.js';
import { normalizeSkill } from '../lib/skills.js';

const role = (over = {}) => ({
  requiredSkills: ['react', 'typescript'],
  niceToHaveSkills: ['tailwind css'],
  minLevel: 'INTERMEDIATE',
  minHoursPerWeek: 10,
  teamType: 'HACKATHON',
  ...over,
});
const member = (over = {}) => ({
  skills: ['react', 'typescript', 'tailwind css'],
  experienceLevel: 'ADVANCED',
  availabilityHrs: 15,
  lookingFor: ['HACKATHON'],
  ...over,
});

describe('computeMatch', () => {
  it('scores a perfect match as 100', () => {
    const result = computeMatch(role(), member());
    expect(result.score).toBe(100);
    expect(result.breakdown).toEqual({ skills: 100, level: 100, availability: 100, type: 100 });
    expect(result.missingSkills).toEqual([]);
    expect(result.matchedSkills).toEqual(['react', 'typescript', 'tailwind css']);
  });

  it('zeroes the skills component when no required skill overlaps', () => {
    const result = computeMatch(role(), member({ skills: ['python', 'tailwind css'] }));
    expect(result.breakdown.skills).toBe(0);
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.missingSkills).toEqual(['react', 'typescript']);
    expect(result.matchedSkills).toEqual(['tailwind css']);
  });

  it('gives skills 100 for a role without skills', () => {
    const result = computeMatch(role({ requiredSkills: [], niceToHaveSkills: [] }), member({ skills: [] }));
    expect(result.breakdown.skills).toBe(100);
  });

  it('scores level 50 one below and 0 two below the minimum', () => {
    expect(
      computeMatch(role({ minLevel: 'ADVANCED' }), member({ experienceLevel: 'INTERMEDIATE' })).breakdown.level,
    ).toBe(50);
    expect(computeMatch(role({ minLevel: 'ADVANCED' }), member({ experienceLevel: 'BEGINNER' })).breakdown.level).toBe(
      0,
    );
    expect(computeMatch(role({ minLevel: null }), member({ experienceLevel: 'BEGINNER' })).breakdown.level).toBe(100);
  });

  it('scores availability proportionally and caps at 100', () => {
    expect(computeMatch(role({ minHoursPerWeek: 10 }), member({ availabilityHrs: 5 })).breakdown.availability).toBe(50);
    expect(computeMatch(role({ minHoursPerWeek: 10 }), member({ availabilityHrs: 40 })).breakdown.availability).toBe(
      100,
    );
    expect(computeMatch(role({ minHoursPerWeek: null }), member({ availabilityHrs: 0 })).breakdown.availability).toBe(
      100,
    );
  });

  it('gives 40 for an empty lookingFor and 0 for a different type', () => {
    expect(computeMatch(role(), member({ lookingFor: [] })).breakdown.type).toBe(40);
    expect(computeMatch(role(), member({ lookingFor: ['STARTUP'] })).breakdown.type).toBe(0);
  });

  it('normalises aliases so ReactJS equals react', () => {
    expect(normalizeSkill('ReactJS')).toBe('react');
    expect(normalizeSkill('  Node   JS ')).toBe('node js');
    expect(normalizeSkill('NodeJS')).toBe('node.js');
    expect(normalizeSkill('.NET')).toBe('net');
    const result = computeMatch(
      role({ requiredSkills: ['React'], niceToHaveSkills: [] }),
      member({ skills: ['ReactJS'] }),
    );
    expect(result.breakdown.skills).toBe(100);
  });

  it('always returns an integer score within 0..100 for random inputs', () => {
    const pool = ['react', 'python', 'go', 'rust', 'sql', 'figma', 'docker', 'java'];
    const pick = () => pool.filter(() => Math.random() < 0.4);
    const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const types = ['HACKATHON', 'STARTUP', 'OPEN_SOURCE', 'COURSE_PROJECT'];
    for (let i = 0; i < 500; i += 1) {
      const result = computeMatch(
        {
          requiredSkills: pick(),
          niceToHaveSkills: pick(),
          minLevel: Math.random() < 0.5 ? null : levels[i % 3],
          minHoursPerWeek: Math.random() < 0.5 ? null : Math.floor(Math.random() * 60),
          teamType: types[i % 4],
        },
        {
          skills: pick(),
          experienceLevel: levels[(i + 1) % 3],
          availabilityHrs: Math.floor(Math.random() * 81),
          lookingFor: types.filter(() => Math.random() < 0.3),
        },
      );
      expect(Number.isInteger(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it('weighs required skills three times a nice-to-have skill', () => {
    const r = role({
      requiredSkills: ['react', 'go'],
      niceToHaveSkills: ['sql', 'figma'],
      minLevel: null,
      minHoursPerWeek: null,
    });
    const hasRequired = computeMatch(r, member({ skills: ['react'] }));
    const hasNice = computeMatch(r, member({ skills: ['sql'] }));
    expect(hasRequired.breakdown.skills).toBe(Math.round((100 * 3) / 8));
    expect(hasRequired.breakdown.skills).toBeGreaterThan(hasNice.breakdown.skills);
    expect(hasNice.breakdown.skills).toBe(0); // no required skill matched
    const bothNice = computeMatch(r, member({ skills: ['react', 'sql', 'figma'] }));
    const oneRequiredMore = computeMatch(r, member({ skills: ['react', 'go'] }));
    expect(oneRequiredMore.breakdown.skills).toBeGreaterThan(bothNice.breakdown.skills);
  });

  it('matches a hand calculation: skills 3/4 weight, level 50, hours 50%, type listed', () => {
    const result = computeMatch(
      {
        requiredSkills: ['react', 'typescript'],
        niceToHaveSkills: ['tailwind css'],
        minLevel: 'ADVANCED',
        minHoursPerWeek: 20,
        teamType: 'HACKATHON',
      },
      {
        skills: ['react', 'tailwind css'],
        experienceLevel: 'INTERMEDIATE',
        availabilityHrs: 10,
        lookingFor: ['HACKATHON'],
      },
    );
    // skills (3+1)/(6+1)=57, level 50, availability 50, type 100 -> .6*57+.15*50+.15*50+.1*100 = 59.2
    expect(result.breakdown).toEqual({ skills: 57, level: 50, availability: 50, type: 100 });
    expect(result.score).toBe(59);
  });
});
