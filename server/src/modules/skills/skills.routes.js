import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import * as controller from './skills.controller.js';
import { createSkillSchema, listSkillsSchema } from './skills.schema.js';

export const skillsRoutes = Router();
skillsRoutes.get('/', validate(listSkillsSchema), controller.list);
skillsRoutes.post('/', requireAuth, validate(createSkillSchema), controller.create);
