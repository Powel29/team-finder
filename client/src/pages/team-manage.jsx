import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button, ErrorState, PageSpinner, Tabs } from '@/components/ui';
import { useTeam } from '@/features/teams/api.js';
import { useTeamActions } from '@/features/teams/manage-api.js';
import { ManageRoles } from '@/features/teams/manage-roles.jsx';
import { DangerZone, ManageMembers, ManageOverview, ManageRequests } from '@/features/teams/manage-sections.jsx';
import { ClosedBanner } from '@/features/teams/team-banners.jsx';
import { usePageTitle } from '@/hooks/use-page-title.js';

export default function TeamManagePage() {
  const { id } = useParams();
  const { data: team, isPending, error, refetch } = useTeam(id);
  const actions = useTeamActions(id);
  const [tab, setTab] = useState('overview');
  usePageTitle(team ? `Manage ${team.name}` : 'Manage team');

  if (isPending) return <PageSpinner />;
  if (error)
    return (
      <ErrorState
        error={error}
        onRetry={refetch}
        title={error.status === 404 ? 'Team not found' : 'Could not load team'}
      />
    );
  if (team.myRelation !== 'OWNER')
    return <ErrorState error={{ message: 'Only the team owner can manage this team.' }} title="Not allowed" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={`/teams/${team.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back to team
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold">Manage {team.name}</h1>
        </div>
        <Link to={`/teams/${team.id}/chat`}>
          <Button variant="secondary" icon={MessageSquare}>
            Team chat
          </Button>
        </Link>
      </div>
      <ClosedBanner team={team} isOwner />
      <Tabs
        label="Manage team"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'roles', label: 'Roles' },
          { value: 'members', label: 'Members', count: team.members.length - 1 },
          { value: 'requests', label: 'Requests' },
          { value: 'danger', label: 'Danger zone' },
        ]}
      />
      {tab === 'overview' && <ManageOverview team={team} actions={actions} />}
      {tab === 'roles' && <ManageRoles team={team} actions={actions} />}
      {tab === 'members' && <ManageMembers team={team} actions={actions} />}
      {tab === 'requests' && <ManageRequests team={team} />}
      {tab === 'danger' && <DangerZone team={team} actions={actions} />}
    </div>
  );
}
