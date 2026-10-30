import * as teams from './teams.service.js';
import * as management from './team-management.service.js';
import { browseTeams } from './teams.browse.js';

export const create = async (req, res) => res.status(201).json(await teams.createTeam(req.user.id, req.valid.body));
export const mine = async (req, res) => res.json(await teams.listMyTeams(req.user.id));
export const get = async (req, res) => res.json(await teams.getTeam(req.valid.params.id, req.user.id));
export const update = async (req, res) =>
  res.json(await teams.updateTeam(req.valid.params.id, req.user.id, req.valid.body));
export const remove = async (req, res) => {
  await teams.deleteTeam(req.valid.params.id, req.user.id);
  res.status(204).end();
};
export const addRole = async (req, res) =>
  res.status(201).json(await teams.addRole(req.valid.params.id, req.user.id, req.valid.body));
export const updateRole = async (req, res) =>
  res.json(await teams.updateRole(req.valid.params.id, req.valid.params.roleId, req.user.id, req.valid.body));
export const removeRole = async (req, res) =>
  res.json(await teams.deleteRole(req.valid.params.id, req.valid.params.roleId, req.user.id));
export const browse = async (req, res) => res.json(await browseTeams(req.user.id, req.valid.query));
export const markFilled = async (req, res) =>
  res.json(await management.markRoleFilled(req.valid.params.id, req.valid.params.roleId, req.user.id));
export const reopen = async (req, res) =>
  res.json(await management.reopenRole(req.valid.params.id, req.valid.params.roleId, req.user.id));
export const removeMember = async (req, res) =>
  res.json(await management.removeMember(req.valid.params.id, req.valid.params.userId, req.user.id));
export const leave = async (req, res) => {
  await management.leaveTeam(req.valid.params.id, req.user.id);
  res.status(204).end();
};
