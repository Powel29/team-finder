import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import * as controller from './members.controller.js';
import { browseMembersSchema, memberParamsSchema, updateProfileSchema } from './members.schema.js';

export const membersRoutes = Router();
membersRoutes.use(requireAuth);
membersRoutes.get('/', validate(browseMembersSchema), controller.browse);
membersRoutes.get('/me', controller.getMe);
membersRoutes.put('/me', validate(updateProfileSchema), controller.putMe);
membersRoutes.get('/:userId', validate(memberParamsSchema), controller.getOne);
