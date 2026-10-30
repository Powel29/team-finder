import { z } from 'zod';
import { LEVELS, PROJECT_TYPES } from '@/lib/constants.js';
import { toDateInput } from '@/lib/format.js';

const skill = z.object({ id: z.string(), name: z.string() });

export const roleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Role title is required').max(60, 'Max 60 characters'),
  slots: z.number().int().min(1).max(10),
  required: z.array(skill).max(30),
  nice: z.array(skill).max(30),
  minLevel: z.string(),
  minHoursPerWeek: z
    .string()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 80), 'Enter 1 to 80 hours'),
});

export const teamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(80, 'Max 80 characters'),
  idea: z.string().trim().min(1, 'Describe your idea').max(2000, 'Max 2000 characters'),
  type: z.enum(PROJECT_TYPES.map((t) => t.value)),
  teamSize: z.number({ error: 'Enter a number' }).int().min(2, 'At least 2 people').max(12, 'At most 12 people'),
  deadline: z.string(),
  techStack: z.array(skill).max(30),
  roles: z.array(roleSchema).min(1, 'Add at least one role'),
});

export const emptyRole = () => ({ title: '', slots: 1, required: [], nice: [], minLevel: '', minHoursPerWeek: '' });

export const emptyTeam = () => ({
  name: '',
  idea: '',
  type: 'HACKATHON',
  teamSize: 4,
  deadline: '',
  techStack: [],
  roles: [emptyRole()],
});

export const teamToForm = (team) => ({
  name: team.name,
  idea: team.idea,
  type: team.type,
  teamSize: team.teamSize,
  deadline: toDateInput(team.deadline),
  techStack: team.techStack,
  roles: team.roles.map((r) => ({
    id: r.id,
    title: r.title,
    slots: r.slots,
    required: r.requiredSkills,
    nice: r.niceToHaveSkills,
    minLevel: r.minLevel ?? '',
    minHoursPerWeek: r.minHoursPerWeek ? String(r.minHoursPerWeek) : '',
  })),
});

export const LEVEL_OPTIONS = LEVELS;

export const rolePayload = (r) => ({
  title: r.title,
  slots: r.slots,
  requiredSkillIds: r.required.map((s) => s.id),
  niceToHaveSkillIds: r.nice.map((s) => s.id),
  minLevel: r.minLevel || null,
  minHoursPerWeek: r.minHoursPerWeek ? Number(r.minHoursPerWeek) : null,
});

export const teamFieldsPayload = (v) => ({
  name: v.name,
  idea: v.idea,
  type: v.type,
  teamSize: v.teamSize,
  deadline: v.deadline ? new Date(`${v.deadline}T00:00:00.000Z`).toISOString() : null,
  techStackIds: v.techStack.map((s) => s.id),
});

export const createTeamPayload = (v) => ({ ...teamFieldsPayload(v), roles: v.roles.map(rolePayload) });
