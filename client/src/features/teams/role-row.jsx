import { Info } from 'lucide-react';
import { Badge, Chip, Dropdown, MatchBreakdown, MatchRing } from '@/components/ui';
import { levelLabel } from '@/lib/constants.js';
import clsx from 'clsx';

function SkillChips({ skills, matched, tone }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <Chip key={s.id} tone={matched ? (matched.has(s.name.toLowerCase()) ? 'success' : 'slate') : tone}>
          {s.name}
        </Chip>
      ))}
    </div>
  );
}

/**
 * One role of a team with fill progress, skills (highlighting the viewer's matches) and a match score.
 * `action` is rendered on the right and is chosen by the page (request, invite, manage…).
 */
export function RoleRow({ role, action }) {
  const { match } = role;
  const matched = match ? new Set(match.matchedSkills.map((s) => s.toLowerCase())) : null;
  const full = role.open === 0;
  const requirements = [
    role.minLevel && `${levelLabel(role.minLevel)}+`,
    role.minHoursPerWeek && `${role.minHoursPerWeek}+ h/week`,
  ].filter(Boolean);

  return (
    <li
      className={clsx(
        'rounded-xl p-4 sm:p-5',
        full ? 'bg-slate-100' : 'bg-slate-50',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg">{role.title}</h3>
            <Badge tone={full ? 'slate' : 'success'}>{full ? 'Filled' : `${role.open} open`}</Badge>
            <span className="text-sm text-slate-600">
              {role.filled}/{role.slots} filled
            </span>
          </div>
          <div
            className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label={`${role.title} filled`}
            aria-valuenow={role.filled}
            aria-valuemin={0}
            aria-valuemax={role.slots}
          >
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${(role.filled / role.slots) * 100}%` }}
            />
          </div>
          {requirements.length > 0 && (
            <p className="mt-2 text-xs font-medium text-slate-600">Needs {requirements.join(' · ')}</p>
          )}
          {role.requiredSkills.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-slate-600">Required</p>
              <SkillChips skills={role.requiredSkills} matched={matched} tone="slate" />
            </div>
          )}
          {role.niceToHaveSkills.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-slate-600">Nice to have</p>
              <SkillChips skills={role.niceToHaveSkills} matched={matched} tone="slate" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          {match && (
            <div className="flex items-center gap-2">
              <MatchRing score={match.score} size={56} showLabel />
              <Dropdown
                label={`Match breakdown for ${role.title}`}
                trigger={
                  <span className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                    <Info className="size-5" aria-hidden />
                  </span>
                }
                panelClassName="w-72 p-4"
              >
                {() => (
                  <>
                    <p className="mb-3 text-sm font-semibold">How you match {role.title}</p>
                    <MatchBreakdown match={match} />
                  </>
                )}
              </Dropdown>
            </div>
          )}
          {action}
        </div>
      </div>
    </li>
  );
}
