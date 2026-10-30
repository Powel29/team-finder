import { Check, X } from 'lucide-react';
import { Chip } from './badge.jsx';

const ROWS = [
  ['skills', 'Skills', '60%'],
  ['level', 'Experience level', '15%'],
  ['availability', 'Availability', '15%'],
  ['type', 'Project type', '10%'],
];

/** Per-component match bars plus matched and missing skills. */
export function MatchBreakdown({ match }) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {ROWS.map(([key, label, weight]) => (
          <li key={key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-slate-700">
                {label} <span className="text-slate-500">({weight})</span>
              </span>
              <span className="font-semibold text-slate-900">{match.breakdown[key]}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-ink" style={{ width: `${match.breakdown[key]}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {match.matchedSkills.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
            <Check className="size-3.5 text-success" aria-hidden /> Matched skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {match.matchedSkills.map((s) => (
              <Chip key={s} tone="success">
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {match.missingSkills.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
            <X className="size-3.5 text-danger" aria-hidden /> Missing required skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {match.missingSkills.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
