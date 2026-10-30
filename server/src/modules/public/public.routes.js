import { Router } from 'express';
import * as publicService from './public.service.js';

export const publicRoutes = Router();
publicRoutes.get('/featured-teams', async (_req, res) => res.json({ items: await publicService.featuredTeams() }));
publicRoutes.get('/stats', async (_req, res) => res.json(await publicService.stats()));
