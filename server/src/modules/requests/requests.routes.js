import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import * as requests from './requests.service.js';
import { inviteSchema, joinSchema, listRequestsSchema, requestParams } from './requests.schema.js';

export const requestsRoutes = Router();
requestsRoutes.use(requireAuth);

requestsRoutes.get('/', validate(listRequestsSchema), async (req, res) =>
  res.json(await requests.listRequests(req.user.id, req.valid.query)),
);
requestsRoutes.post('/join', validate(joinSchema), async (req, res) =>
  res.status(201).json(await requests.sendJoinRequest(req.user.id, req.valid.body)),
);
requestsRoutes.post('/invite', validate(inviteSchema), async (req, res) =>
  res.status(201).json(await requests.sendInvite(req.user.id, req.valid.body)),
);
requestsRoutes.post('/:id/accept', validate(requestParams), async (req, res) =>
  res.json(await requests.acceptRequest(req.valid.params.id, req.user.id)),
);
requestsRoutes.post('/:id/decline', validate(requestParams), async (req, res) =>
  res.json(await requests.declineRequest(req.valid.params.id, req.user.id)),
);
requestsRoutes.post('/:id/cancel', validate(requestParams), async (req, res) =>
  res.json(await requests.cancelRequest(req.valid.params.id, req.user.id)),
);
