import * as members from './members.service.js';
import { browseMembers } from './members.browse.js';

export const getMe = async (req, res) => res.json(await members.getOwnProfile(req.user.id));
export const putMe = async (req, res) => res.json(await members.upsertOwnProfile(req.user.id, req.valid.body));
export const getOne = async (req, res) =>
  res.json(await members.getMember(req.user.id, req.valid.params.userId, req.valid.query.roleId));
export const browse = async (req, res) => res.json(await browseMembers(req.user.id, req.valid.query));
