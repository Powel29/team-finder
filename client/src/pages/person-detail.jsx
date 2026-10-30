import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Briefcase, Clock, ExternalLink } from 'lucide-react';
import {
  Avatar,
  Badge,
  Card,
  Chip,
  ErrorState,
  MatchBreakdown,
  MatchRing,
  PageSpinner,
  ProgressBar,
  Select,
} from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { useMember } from '@/features/people/api.js';
import { InviteButton } from '@/features/requests/invite-button.jsx';
import { useMyTeams } from '@/features/teams/api.js';
import { levelLabel, typeLabel } from '@/lib/constants.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

function RolePicker({ roleId, onChange }) {
  const { data } = useMyTeams();
  const options = (data?.owned ?? []).flatMap((team) =>
    team.roles.filter((r) => r.open > 0).map((r) => ({ id: r.id, label: `${team.name} › ${r.title}` })),
  );
  if (options.length === 0)
    return (
      <p className="text-sm text-slate-600">Create a team with an open role to see how well this person matches it.</p>
    );
  return (
    <Select label="Compare with one of your open roles" value={roleId} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select a role…</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export default function PersonDetailPage() {
  const { userId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleId = searchParams.get('roleId') ?? '';
  const { user } = useAuth();
  const { data: person, isPending, error, refetch } = useMember(userId, roleId || undefined);
  usePageTitle(person?.name ?? 'Profile');
  const isSelf = user.id === userId;

  if (isPending) return <PageSpinner />;
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={refetch}
        title={error.status === 404 ? 'Profile not found' : 'Could not load profile'}
      />
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={person.name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold">{person.name}</h1>
            <p className="mt-1 text-slate-600">{person.headline || 'No headline yet'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{levelLabel(person.experienceLevel)}</Badge>
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <Clock className="size-4" aria-hidden /> {person.availabilityHrs} h/week
              </span>
              {!person.isDiscoverable && <Badge tone="warning">Hidden from search</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {person.githubUrl && (
                <a
                  href={person.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                >
                  GitHub <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
              {person.portfolioUrl && (
                <a
                  href={person.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                >
                  Portfolio <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
          {!isSelf && <InviteButton person={person} roleId={roleId} size="md" />}
          {isSelf && (
            <Link
              to="/profile"
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50"
            >
              Edit profile
            </Link>
          )}
        </div>
        {person.bio && <p className="mt-5 whitespace-pre-line text-slate-700">{person.bio}</p>}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Skills</h2>
          {person.skills.length === 0 ? (
            <p className="text-sm text-slate-600">No skills listed yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {person.skills.map((s) => (
                <Chip key={s.id} tone={person.match?.matchedSkills.includes(s.name) ? 'success' : 'brand'}>
                  {s.name}
                </Chip>
              ))}
            </div>
          )}
          {person.interests.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-slate-600">Interests</h3>
              <div className="flex flex-wrap gap-1.5">
                {person.interests.map((i) => (
                  <Chip key={i}>{i}</Chip>
                ))}
              </div>
            </>
          )}
          {person.lookingFor.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-slate-600">
                <Briefcase className="size-4" aria-hidden /> Looking for
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {person.lookingFor.map((t) => (
                  <Badge key={t}>{typeLabel(t)}</Badge>
                ))}
              </div>
            </>
          )}
          {isSelf && <ProgressBar className="mt-5" value={person.completeness} label="Profile completeness" />}
        </Card>

        {!isSelf && (
          <Card>
            <h2 className="mb-3 text-lg font-bold">Match for your team</h2>
            <RolePicker
              roleId={roleId}
              onChange={(next) => setSearchParams(next ? { roleId: next } : {}, { replace: true })}
            />
            {person.match && (
              <div className="mt-5 space-y-4">
                <MatchRing score={person.match.score} size={72} showLabel />
                <MatchBreakdown match={person.match} />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
