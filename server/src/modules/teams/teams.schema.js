import { z } from 'zod';
import { csv, paginationSchema } from '../../lib/pagination.js';
import { LEVELS, PROJECT_TYPES } from '../members/members.schema.js';

const id = z.string().min(1);
export const teamParams = { params: z.object({ id }) };
export const roleParams = { params: z.object({ id, roleId: id }) };
export const memberParams = { params: z.object({ id, userId: id }) };

const idList = z.array(id).max(30);
const nameList = z.array(z.string().trim().min(1).max(40)).max(30);
const notEmpty = (body) => Object.keys(body).length > 0;

// Skill lists are optional: undefined means "leave unchanged" on update and "none" on create.
const roleBase = z.object({
  title: z.string().trim().min(1, 'Role title is required').max(60, 'Max 60 characters'),
  slots: z.coerce.number().int().min(1, 'At least 1 slot').max(10, 'At most 10 slots'),
  requiredSkillIds: idList,
  requiredSkillNames: nameList,
  niceToHaveSkillIds: idList,
  niceToHaveSkillNames: nameList,
  minLevel: z.enum(LEVELS).nullish(),
  minHoursPerWeek: z.coerce.number().int().min(1, 'At least 1 hour').max(80, 'At most 80 hours').nullish(),
});

const teamBase = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(80, 'Max 80 characters'),
  idea: z.string().trim().min(1, 'Describe your idea').max(2000, 'Max 2000 characters'),
  type: z.enum(PROJECT_TYPES),
  teamSize: z.coerce.number().int().min(2, 'At least 2 people').max(12, 'At most 12 people'),
  deadline: z.coerce.date({ error: 'Invalid date' }).nullish(),
  techStackIds: idList,
  techStackNames: nameList,
});

export const createTeamSchema = {
  body: teamBase.partial({ deadline: true, techStackIds: true, techStackNames: true }).extend({
    roles: z
      .array(roleBase.partial().required({ title: true, slots: true }))
      .min(1, 'Add at least one role')
      .max(12),
  }),
};

export const updateTeamSchema = {
  ...teamParams,
  body: teamBase
    .partial()
    .extend({ status: z.enum(['OPEN', 'ARCHIVED']).optional() })
    .refine(notEmpty, 'Nothing to update'),
};

export const createRoleSchema = { ...teamParams, body: roleBase.partial().required({ title: true, slots: true }) };
export const updateRoleSchema = { ...roleParams, body: roleBase.partial().refine(notEmpty, 'Nothing to update') };

export const browseTeamsSchema = {
  query: z.object({
    q: z.string().trim().max(80).optional(),
    stack: csv,
    roleSkill: csv,
    type: csv.pipe(z.array(z.enum(PROJECT_TYPES))),
    deadlineBefore: z.coerce.date().optional(),
    includeClosed: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    sort: z.enum(['match', 'deadline', 'recent']).default('recent'),
    ...paginationSchema,
  }),
};
