import * as match from './match.service.js';
import { decorateTeamDtos } from '../teams/team-decorator.js';

export const get = async (req, res) => res.json(await match.getMatchForRequester(req.user.id, req.valid.query));

export const members = async (req, res) =>
  res.json({ items: await match.recommendMembers(req.user.id, req.valid.query.roleId) });

export const teams = async (req, res) => {
  const picks = await match.recommendTeams(req.user.id);
  const decorated = await decorateTeamDtos(
    picks.map((p) => p.team),
    req.user.id,
  );
  res.json({ items: picks.map((p, i) => ({ team: decorated[i], role: p.role, match: p.match })) });
};
