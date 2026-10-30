import { normalizeSkill } from './skills.js';

/**
 * @typedef {'BEGINNER'|'INTERMEDIATE'|'ADVANCED'} Level
 * @typedef {'HACKATHON'|'STARTUP'|'OPEN_SOURCE'|'COURSE_PROJECT'} ProjectType
 *
 * @typedef {Object} MatchRole
 * @property {string[]} requiredSkills
 * @property {string[]} niceToHaveSkills
 * @property {Level|null} [minLevel]
 * @property {number|null} [minHoursPerWeek]
 * @property {ProjectType} teamType
 *
 * @typedef {Object} MatchMember
 * @property {string[]} skills
 * @property {Level} experienceLevel
 * @property {number} availabilityHrs
 * @property {ProjectType[]} lookingFor
 *
 * @typedef {Object} MatchResult
 * @property {number} score integer 0..100
 * @property {{skills:number, level:number, availability:number, type:number}} breakdown each 0..100
 * @property {string[]} matchedSkills required and nice-to-have skills the member has
 * @property {string[]} missingSkills required skills the member lacks
 * @property {string[]} missingNiceToHave
 */

const LEVELS = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };
const WEIGHTS = { skills: 0.6, level: 0.15, availability: 0.15, type: 0.1 };
const REQUIRED_WEIGHT = 3;
const NICE_WEIGHT = 1;

const unique = (list) => [...new Set(list.map(normalizeSkill))];

function skillsComponent(required, nice, owned) {
  const requiredHit = required.filter((s) => owned.has(s));
  const niceHit = nice.filter((s) => owned.has(s));
  const possible = REQUIRED_WEIGHT * required.length + NICE_WEIGHT * nice.length;
  const earned = REQUIRED_WEIGHT * requiredHit.length + NICE_WEIGHT * niceHit.length;
  let skills = possible === 0 ? 100 : Math.round((100 * earned) / possible);
  if (required.length > 0 && requiredHit.length === 0) skills = 0;
  return { skills, requiredHit, niceHit };
}

function levelComponent(minLevel, level) {
  if (!minLevel) return 100;
  const diff = LEVELS[level] - LEVELS[minLevel];
  if (diff >= 0) return 100;
  return diff === -1 ? 50 : 0;
}

function availabilityComponent(minHours, hours) {
  if (!minHours) return 100;
  return Math.min(100, Math.round((100 * hours) / minHours));
}

function typeComponent(teamType, lookingFor) {
  if (lookingFor.length === 0) return 40;
  return lookingFor.includes(teamType) ? 100 : 0;
}

/**
 * Pure, deterministic match between a team role and a member profile.
 * @param {MatchRole} role
 * @param {MatchMember} member
 * @returns {MatchResult}
 */
export function computeMatch(role, member) {
  const required = unique(role.requiredSkills);
  const nice = unique(role.niceToHaveSkills).filter((s) => !required.includes(s));
  const owned = new Set(member.skills.map(normalizeSkill));

  const { skills, requiredHit, niceHit } = skillsComponent(required, nice, owned);
  const breakdown = {
    skills,
    level: levelComponent(role.minLevel, member.experienceLevel),
    availability: availabilityComponent(role.minHoursPerWeek, member.availabilityHrs),
    type: typeComponent(role.teamType, member.lookingFor),
  };

  const weighted = Object.keys(WEIGHTS).reduce((sum, key) => sum + WEIGHTS[key] * breakdown[key], 0);
  return {
    score: Math.min(100, Math.max(0, Math.round(weighted))),
    breakdown,
    matchedSkills: [...requiredHit, ...niceHit],
    missingSkills: required.filter((s) => !owned.has(s)),
    missingNiceToHave: nice.filter((s) => !owned.has(s)),
  };
}

export function matchTier(score) {
  if (score >= 85) return 'Excellent match';
  if (score >= 70) return 'Strong match';
  if (score >= 50) return 'Decent match';
  return 'Low match';
}
