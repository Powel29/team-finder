import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import * as chat from './chat.service.js';
import { historySchema, postMessageSchema } from './chat.schema.js';

export const chatRoutes = Router({ mergeParams: true });
chatRoutes.use(requireAuth);
chatRoutes.get('/', validate(historySchema), async (req, res) =>
  res.json(await chat.getHistory(req.valid.params.id, req.user.id, req.valid.query)),
);
chatRoutes.post('/', validate(postMessageSchema), async (req, res) =>
  res.status(201).json(await chat.sendMessage(req.valid.params.id, req.user.id, req.valid.body.body)),
);
