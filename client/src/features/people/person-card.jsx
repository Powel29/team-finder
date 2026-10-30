import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Avatar, Badge, Card, Chip, MatchRing } from '@/components/ui';
import { levelLabel, typeLabel } from '@/lib/constants.js';

export function PersonCard({ person, actions, roleId }) {
  const to = roleId ? `/people/${person.userId}?roleId=${roleId}` : `/people/${person.userId}`;
  return (
    <Card as="article" interactive className="relative flex h-full flex-col">
      <div className="flex items-start gap-3">
        <Avatar name={person.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg">
            <Link to={to} className="after:absolute after:inset-0 hover:underline">
              {person.name}
            </Link>
          </h3>
          <p className="line-clamp-2 text-sm text-slate-600">{person.headline || 'No headline yet'}</p>
        </div>
        {person.match && <MatchRing score={person.match.score} size={48} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge>{levelLabel(person.experienceLevel)}</Badge>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
          <Clock className="size-3.5" aria-hidden /> {person.availabilityHrs} h/week
        </span>
      </div>
      {person.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {person.skills.slice(0, 5).map((s) => (
            <Chip key={s.id}>{s.name}</Chip>
          ))}
          {person.skills.length > 5 && <Chip>+{person.skills.length - 5}</Chip>}
        </div>
      )}
      {person.lookingFor.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {person.lookingFor.map((t) => (
            <Badge key={t} tone="slate">
              {typeLabel(t)}
            </Badge>
          ))}
        </div>
      )}
      {actions && <div className="relative z-10 mt-auto flex gap-2 pt-4">{actions}</div>}
    </Card>
  );
}
