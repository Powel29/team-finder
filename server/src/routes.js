import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes.js';
import { skillsRoutes } from './modules/skills/skills.routes.js';
import { membersRoutes } from './modules/members/members.routes.js';
import { teamsRoutes } from './modules/teams/teams.routes.js';
import { matchRoutes } from './modules/match/match.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';
import { requestsRoutes } from './modules/requests/requests.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';

export function apiRoutes(authLimiter) {
  const router = Router();
  router.use('/auth', authRoutes(authLimiter));
  router.use('/skills', skillsRoutes);
  router.use('/members', membersRoutes);
  router.use('/teams/:id/messages', chatRoutes);
  router.use('/teams', teamsRoutes);
  router.use('/match', matchRoutes);
  router.use('/public', publicRoutes);
  router.use('/requests', requestsRoutes);
  router.use('/dashboard', dashboardRoutes);
  router.use('/notifications', notificationsRoutes);
  return router;
}
