import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import * as notifications from './notifications.service.js';
import { listNotificationsSchema, notificationParams } from './notifications.schema.js';

export const notificationsRoutes = Router();
notificationsRoutes.use(requireAuth);

notificationsRoutes.get('/', validate(listNotificationsSchema), async (req, res) =>
  res.json(await notifications.listNotifications(req.user.id, req.valid.query)),
);
notificationsRoutes.get('/unread-count', async (req, res) =>
  res.json({ count: await notifications.unreadCount(req.user.id) }),
);
notificationsRoutes.post('/read-all', async (req, res) => res.json(await notifications.markAllRead(req.user.id)));
notificationsRoutes.post('/:id/read', validate(notificationParams), async (req, res) =>
  res.json(await notifications.markRead(req.user.id, req.valid.params.id)),
);
