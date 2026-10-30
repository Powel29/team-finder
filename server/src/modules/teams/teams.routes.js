import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import * as controller from './teams.controller.js';
import {
  browseTeamsSchema,
  createRoleSchema,
  createTeamSchema,
  memberParams,
  roleParams,
  teamParams,
  updateRoleSchema,
  updateTeamSchema,
} from './teams.schema.js';

export const teamsRoutes = Router();
teamsRoutes.use(requireAuth);

teamsRoutes.get('/', validate(browseTeamsSchema), controller.browse);
teamsRoutes.post('/', validate(createTeamSchema), controller.create);
teamsRoutes.get('/mine', controller.mine);
teamsRoutes.get('/:id', validate(teamParams), controller.get);
teamsRoutes.patch('/:id', validate(updateTeamSchema), controller.update);
teamsRoutes.delete('/:id', validate(teamParams), controller.remove);
teamsRoutes.post('/:id/roles', validate(createRoleSchema), controller.addRole);
teamsRoutes.patch('/:id/roles/:roleId', validate(updateRoleSchema), controller.updateRole);
teamsRoutes.delete('/:id/roles/:roleId', validate(roleParams), controller.removeRole);
teamsRoutes.post('/:id/roles/:roleId/mark-filled', validate(roleParams), controller.markFilled);
teamsRoutes.post('/:id/roles/:roleId/reopen', validate(roleParams), controller.reopen);
teamsRoutes.delete('/:id/members/:userId', validate(memberParams), controller.removeMember);
teamsRoutes.post('/:id/leave', validate(teamParams), controller.leave);
