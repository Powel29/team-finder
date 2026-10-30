import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import * as dashboard from './dashboard.service.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/summary', async (req, res) => res.json(await dashboard.summary(req.user.id)));
dashboardRoutes.get('/owner', async (req, res) => res.json({ teams: await dashboard.ownerView(req.user.id) }));
dashboardRoutes.get('/member', async (req, res) => res.json(await dashboard.memberView(req.user.id)));
