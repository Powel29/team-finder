import { Link } from 'react-router-dom';
import { CalendarClock, Users } from 'lucide-react';
import { Badge, Card, Chip, MatchRing } from '@/components/ui';
import { typeLabel } from '@/lib/constants.js';
import { deadlineInfo } from '@/lib/format.js';

const STATUS_TONE = { OPEN: 'success', CLOSED: 'slate', ARCHIVED: 'warning' };

export function TeamCard({ team, bestMatch }) {
  const deadline = deadlineInfo(team.deadline);
  return (
    <Card as="article" interactive className="relative flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge>{typeLabel(team.type)}</Badge>
            {team.status !== 'OPEN' && (
              <Badge tone={STATUS_TONE[team.status]}>{team.status === 'CLOSED' ? 'Closed' : 'Archived'}</Badge>
            )}
          </div>
          <h3 className="truncate text-lg">
            <Link to={`/teams/${team.id}`} className="after:absolute after:inset-0 hover:underline">
              {team.name}
            </Link>
          </h3>
        </div>
        {bestMatch && <MatchRing score={bestMatch.score} size={48} />}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{team.idea}</p>
      {team.techStack.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {team.techStack.slice(0, 5).map((s) => (
            <Chip key={s.id}>{s.name}</Chip>
          ))}
          {team.techStack.length > 5 && <Chip>+{team.techStack.length - 5}</Chip>}
        </div>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {team.roles.slice(0, 4).map((r) => (
          <li key={r.id} className="flex justify-between gap-2 text-slate-700">
            <span className="truncate">{r.title}</span>
            <span className={r.open === 0 ? 'text-slate-500' : 'font-medium text-slate-900'}>
              {r.filled}/{r.slots}
            </span>
          </li>
        ))}
        {team.roles.length > 4 && <li className="text-xs text-slate-600">+{team.roles.length - 4} more roles</li>}
      </ul>
      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> {team.memberCount} member{team.memberCount === 1 ? '' : 's'} ·{' '}
          {team.openSlots} open
        </span>
        {deadline && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden /> {deadline.label}
          </span>
        )}
      </div>
    </Card>
  );
}
