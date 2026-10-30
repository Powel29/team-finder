import { z } from 'zod';
import { LEVELS, PROJECT_TYPES } from '@/lib/constants.js';

const isHttp = (v) => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const isGithub = (v) => isHttp(v) && ['github.com', 'www.github.com'].includes(new URL(v).hostname.toLowerCase());

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Max 80 characters'),
  headline: z.string().trim().max(120, 'Max 120 characters'),
  bio: z.string().trim().max(1000, 'Max 1000 characters'),
  skills: z.array(z.object({ id: z.string(), name: z.string() })).max(30, 'Max 30 skills'),
  experienceLevel: z.enum(LEVELS.map((l) => l.value)),
  availabilityHrs: z.number().int().min(0).max(80),
  githubUrl: z
    .string()
    .trim()
    .refine((v) => !v || isGithub(v), 'Must be a github.com URL, e.g. https://github.com/you'),
  portfolioUrl: z
    .string()
    .trim()
    .refine((v) => !v || isHttp(v), 'Must be a valid http(s) URL'),
  interests: z.array(z.string()).max(15, 'Max 15 interests'),
  lookingFor: z.array(z.enum(PROJECT_TYPES.map((t) => t.value))),
  isDiscoverable: z.boolean(),
});

export const emptyProfile = (name = '') => ({
  name,
  headline: '',
  bio: '',
  skills: [],
  experienceLevel: 'BEGINNER',
  availabilityHrs: 5,
  githubUrl: '',
  portfolioUrl: '',
  interests: [],
  lookingFor: [],
  isDiscoverable: true,
});

export const profileToForm = (profile, name) => ({
  name,
  headline: profile.headline,
  bio: profile.bio,
  skills: profile.skills,
  experienceLevel: profile.experienceLevel,
  availabilityHrs: profile.availabilityHrs,
  githubUrl: profile.githubUrl ?? '',
  portfolioUrl: profile.portfolioUrl ?? '',
  interests: profile.interests,
  lookingFor: profile.lookingFor,
  isDiscoverable: profile.isDiscoverable,
});

export const formToPayload = ({ skills, ...rest }) => ({ ...rest, skillIds: skills.map((s) => s.id) });

export const STEP_FIELDS = [
  ['name', 'headline', 'bio', 'githubUrl', 'portfolioUrl'],
  ['skills', 'experienceLevel', 'interests'],
  ['availabilityHrs', 'lookingFor', 'isDiscoverable'],
];
