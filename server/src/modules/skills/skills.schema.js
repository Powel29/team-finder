import { z } from 'zod';
import { csv } from '../../lib/pagination.js';

export const listSkillsSchema = { query: z.object({ q: z.string().trim().max(60).optional(), ids: csv }) };
export const createSkillSchema = {
  body: z.object({ name: z.string().trim().min(1, 'Skill name is required').max(40) }),
};
