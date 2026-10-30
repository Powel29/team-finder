import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, LogOut, MessageSquare, Settings } from 'lucide-react';
import { Avatar, Badge, Button, Card, Chip, ConfirmDialog, ErrorState, PageSpinner } from '@/components/ui';
import { useTeam } from '@/features/teams/api.js';
import { useTeamActions } from '@/features/teams/manage-api.js';
import { ClosedBanner } from '@/features/teams/team-banners.jsx';
import { RoleActions } from '@/features/requests/role-actions.jsx';
import { RoleRow } from '@/features/teams/role-row.jsx';
import { typeLabel } from '@/lib/constants.js';
import { deadlineInfo, formatDate } from '@/lib/format.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

const STATUS = { OPEN: ['success', 'Open'], CLOSED: ['slate', 'Closed'], ARCHIVED: ['warning', 'Archived'] };

export default function TeamDetailPage() {
  const { id } = useParams();
  const { data: team, isPending, error, refetch } = useTeam(id);
  const actions = useTeamActions(id);
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  usePageTitle(team?.name ?? 'Team');

  if (isPending) return <PageSpinner />;
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={refetch}
        title={error.status === 404 ? 'Team not found' : 'Could not load team'}
      />
    );

  const isOwner = team.myRelation === 'OWNER';
  const isMember = team.myRelation === 'MEMBER';
  const deadline = deadlineInfo(team.deadline);
  const [statusTone, statusLabel] = STATUS[team.status];

  return (
    <div className="space-y-6">
      <ClosedBanner team={team} isOwner={isOwner} />
      <div>
        <nav aria-label="Breadcrumb" className="text-xs text-slate-600">
          <Link to="/browse?tab=teams" className="hover:underline">
            Browse
          </Link>{' '}
          / <span className="text-slate-900">{team.name}</span>
        </nav>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl">{team.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Led by {team.owner.name} · {team.memberCount} member{team.memberCount === 1 ? '' : 's'} · target size{' '}
              {team.teamSize}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge>{typeLabel(team.type)}</Badge>
              <Badge tone={statusTone}>{statusLabel}</Badge>
              {deadline && (
                <Badge tone={deadline.tone}>
                  <CalendarClock className="size-3.5" aria-hidden /> {deadline.label} · {formatDate(team.deadline)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(isOwner || isMember) && (
              <Link to={`/teams/${team.id}/chat`}>
                <Button variant="secondary" size="sm" icon={MessageSquare}>
                  Open chat
                </Button>
              </Link>
            )}
            {isOwner && (
              <Link to={`/teams/${team.id}/manage`}>
                <Button variant="secondary" size="sm" icon={Settings}>
                  Manage team
                </Button>
              </Link>
            )}
            {isMember && (
              <Button variant="ghost" size="sm" icon={LogOut} onClick={() => setLeaving(true)}>
                Leave team
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card as="section" aria-labelledby="idea" className="p-6">
            <h2 id="idea" className="mb-3 text-xl">
              The idea
            </h2>
            <p className="whitespace-pre-line text-slate-700">{team.idea}</p>
            {team.techStack.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {team.techStack.map((s) => (
                  <Chip key={s.id}>{s.name}</Chip>
                ))}
              </div>
            )}
          </Card>
          <Card as="section" aria-labelledby="roles" className="p-6">
            <h2 id="roles" className="mb-3 text-xl">
              Roles
            </h2>
            <ul className="space-y-3">
              {team.roles.map((role) => (
                <RoleRow key={role.id} role={role} action={<RoleActions team={team} role={role} />} />
              ))}
            </ul>
          </Card>
        </div>
        <aside aria-labelledby="members">
          <Card className="p-5">
            <h2 id="members" className="mb-2 text-xl">
              Members
            </h2>
            <ul>
              {team.members.map((m) => (
                <li key={m.userId} className="flex items-center gap-3 py-2">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0">
                    <Link
                      to={`/people/${m.userId}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {m.name}
                    </Link>
                    <p className="text-xs text-slate-600">{m.isOwner ? 'Owner' : (m.roleTitle ?? 'Member')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
      <ConfirmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title={`Leave ${team.name}?`}
        description="You lose access to the team chat and your slot is freed. You can request to join again later."
        confirmLabel="Leave team"
        loading={actions.leave.isPending}
        onConfirm={async () => {
          try {
            await actions.leave.mutateAsync();
            toast.success('You left the team');
            navigate('/teams');
          } catch (err) {
            toast.error(err.message);
          }
        }}
      />
    </div>
  );
}
