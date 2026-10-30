import { z } from 'zod';
import { csv, paginationSchema } from '../../lib/pagination.js';

export const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
export const PROJECT_TYPES = ['HACKATHON', 'STARTUP', 'OPEN_SOURCE', 'COURSE_PROJECT'];

const httpUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => {
    try {
      return ['http:', 'https:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL');

const githubUrl = httpUrl.refine((v) => {
  const host = new URL(v).hostname.toLowerCase();
  return host === 'github.com' || host === 'www.github.com';
}, 'Must be a github.com URL');

// Empty strings from forms mean "not provided".
const optionalUrl = (schema) => z.preprocess((v) => (v === '' || v === undefined ? null : v), schema.nullable());

const tag = z.string().trim().min(1).max(30);

export const updateProfileSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(80).optional(),
    headline: z.string().trim().max(120).default(''),
    bio: z.string().trim().max(1000).default(''),
    skillIds: z.array(z.string()).max(30).default([]),
    skillNames: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    experienceLevel: z.enum(LEVELS),
    availabilityHrs: z.coerce.number().int().min(0, 'Min 0 hours').max(80, 'Max 80 hours'),
    githubUrl: optionalUrl(githubUrl).default(null),
    portfolioUrl: optionalUrl(httpUrl).default(null),
    interests: z.array(tag).max(15).default([]),
    lookingFor: z.array(z.enum(PROJECT_TYPES)).max(4).default([]),
    isDiscoverable: z.boolean().default(true),
  }),
};

export const memberParamsSchema = {
  params: z.object({ userId: z.string().min(1) }),
  query: z.object({ roleId: z.string().min(1).optional() }),
};

export const browseMembersSchema = {
  query: z.object({
    q: z.string().trim().max(80).optional(),
    skills: csv,
    skillMode: z.enum(['any', 'all']).default('any'),
    level: csv.pipe(z.array(z.enum(LEVELS))),
    minHours: z.coerce.number().int().min(0).max(80).optional(),
    lookingFor: csv.pipe(z.array(z.enum(PROJECT_TYPES))),
    roleId: z.string().min(1).optional(),
    sort: z.enum(['match', 'recent']).default('recent'),
    ...paginationSchema,
  }),
};
