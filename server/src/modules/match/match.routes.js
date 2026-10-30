import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import * as controller from './match.controller.js';
import { matchQuerySchema, recommendMembersSchema } from './match.schema.js';

export const matchRoutes = Router();
matchRoutes.use(requireAuth);
matchRoutes.get('/', validate(matchQuerySchema), controller.get);
matchRoutes.get('/recommendations/members', validate(recommendMembersSchema), controller.members);
matchRoutes.get('/recommendations/teams', controller.teams);
