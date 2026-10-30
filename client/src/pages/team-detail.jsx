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
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{typeLabel(team.type)}</Badge>
              <Badge tone={statusTone}>{statusLabel}</Badge>
              {deadline && (
                <Badge tone={deadline.tone}>
                  <CalendarClock className="size-3.5" aria-hidden /> {deadline.label} · {formatDate(team.deadline)}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-extrabold">{team.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Led by <span className="font-semibold">{team.owner.name}</span> · {team.memberCount} member
              {team.memberCount === 1 ? '' : 's'} · target size {team.teamSize}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(isOwner || isMember) && (
              <Link to={`/teams/${team.id}/chat`}>
                <Button variant="secondary" icon={MessageSquare}>
                  Open chat
                </Button>
              </Link>
            )}
            {isOwner && (
              <Link to={`/teams/${team.id}/manage`}>
                <Button variant="secondary" icon={Settings}>
                  Manage team
                </Button>
              </Link>
            )}
            {isMember && (
              <Button variant="ghost" icon={LogOut} onClick={() => setLeaving(true)}>
                Leave team
              </Button>
            )}
          </div>
        </div>
        <p className="mt-5 whitespace-pre-line text-slate-700">{team.idea}</p>
        {team.techStack.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {team.techStack.map((s) => (
              <Chip key={s.id} tone="brand">
                {s.name}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="roles">
          <h2 id="roles" className="mb-3 text-xl font-bold">
            Roles
          </h2>
          <ul className="space-y-3">
            {team.roles.map((role) => (
              <RoleRow key={role.id} role={role} action={<RoleActions team={team} role={role} />} />
            ))}
          </ul>
        </section>
        <aside aria-labelledby="members">
          <h2 id="members" className="mb-3 text-xl font-bold">
            Members
          </h2>
          <Card className="p-2">
            <ul className="divide-y divide-slate-100">
              {team.members.map((m) => (
                <li key={m.userId} className="flex items-center gap-3 p-3">
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0">
                    <Link
                      to={`/people/${m.userId}`}
                      className="block truncate text-sm font-semibold hover:text-brand-700"
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
