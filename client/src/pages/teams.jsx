import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { Button, CardSkeletons, EmptyState, ErrorState } from '@/components/ui';
import { useMyTeams } from '@/features/teams/api.js';
import { TeamCard } from '@/features/teams/team-card.jsx';
import { usePageTitle } from '@/hooks/use-page-title.js';

function Section({ title, teams, empty }) {
  return (
    <section aria-label={title} className="space-y-4">
      <h2 className="text-xl font-bold">
        {title} <span className="text-slate-500">({teams.length})</span>
      </h2>
      {teams.length === 0 ? (
        empty
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function TeamsPage() {
  usePageTitle('My teams');
  const { data, isPending, error, refetch } = useMyTeams();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">My teams</h1>
        <Link to="/teams/new">
          <Button icon={Plus}>Create team</Button>
        </Link>
      </div>
      {isPending && <CardSkeletons count={3} />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {data && (
        <>
          <Section
            title="Teams I own"
            teams={data.owned}
            empty={
              <EmptyState
                icon={Users}
                title="You do not own a team yet"
                description="Create a team, define the roles you need and start inviting people."
                action={
                  <Link to="/teams/new">
                    <Button icon={Plus}>Create team</Button>
                  </Link>
                }
              />
            }
          />
          <Section
            title="Teams I joined"
            teams={data.joined}
            empty={
              <EmptyState
                icon={Users}
                title="You have not joined a team yet"
                description="Browse open teams and send a join request to a role that fits you."
                action={
                  <Link to="/browse?tab=teams">
                    <Button variant="secondary">Browse teams</Button>
                  </Link>
                }
              />
            }
          />
        </>
      )}
    </div>
  );
}
