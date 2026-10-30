import * as skills from './skills.service.js';

export const list = async (req, res) =>
  res.json({ items: await skills.listSkills(req.valid.query.q, req.valid.query.ids) });
export const create = async (req, res) => res.status(201).json(await skills.createSkill(req.valid.body.name));
