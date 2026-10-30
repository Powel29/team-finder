import { Link } from 'react-router-dom';
import { Plus, Settings, Users } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { PersonCard } from '@/features/people/person-card.jsx';
import { InviteButton } from '@/features/requests/invite-button.jsx';
import { RequestRow } from '@/features/requests/request-row.jsx';
import { useOwnerDashboard } from '@/features/requests/api.js';
import { useRequestActions } from '@/features/requests/use-request-actions.js';

function TeamPanel({ entry, run, busyId }) {
  const { team, roles, pendingRequests, recommendedPeople, recommendedForRole } = entry;
  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg">
            <Link to={`/teams/${team.id}`} className="hover:underline">
              {team.name}
            </Link>
          </h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <Badge tone={team.status === 'OPEN' ? 'success' : 'slate'}>
              {team.status === 'OPEN' ? 'Open' : 'Closed'}
            </Badge>
            {team.memberCount} member{team.memberCount === 1 ? '' : 's'} · {team.openSlots} open slot
            {team.openSlots === 1 ? '' : 's'}
          </div>
        </div>
        <Link to={`/teams/${team.id}/manage`}>
          <Button size="sm" variant="secondary" icon={Settings}>
            Manage
          </Button>
        </Link>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2" aria-label={`Roles in ${team.name}`}>
        {roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium">{r.title}</span>
            <span className={r.open === 0 ? 'text-slate-500' : 'font-medium text-slate-900'}>
              {r.filled}/{r.slots} filled
            </span>
          </li>
        ))}
      </ul>

      <div>
        <h4 className="mb-2 text-sm font-medium text-slate-600">Incoming requests</h4>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-slate-600">No pending requests for this team.</p>
        ) : (
          <ul className="space-y-3">
            {pendingRequests.map((r) => (
              <RequestRow key={r.id} request={r} onAction={run} busyId={busyId} />
            ))}
          </ul>
        )}
      </div>

      {recommendedPeople.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-slate-600">
            Recommended for {recommendedForRole.title}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedPeople.map((p) => (
              <PersonCard
                key={p.userId}
                person={p}
                roleId={recommendedForRole.id}
                actions={<InviteButton person={p} roleId={recommendedForRole.id} />}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function OwnerPanels() {
  const { data, isPending, error, refetch } = useOwnerDashboard(true);
  const { run, busyId } = useRequestActions();
  return (
    <section aria-label="My teams" className="space-y-4">
      <h2 className="text-xl">My teams</h2>
      {isPending && <Skeleton className="h-48" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data?.teams.length === 0 && (
        <EmptyState
          icon={Users}
          title="You do not own a team yet"
          description="Create a team, list the roles you need and invite great people."
          action={
            <Link to="/teams/new">
              <Button icon={Plus}>Create team</Button>
            </Link>
          }
        />
      )}
      {data?.teams.map((entry) => (
        <TeamPanel key={entry.team.id} entry={entry} run={run} busyId={busyId} />
      ))}
    </section>
  );
}
