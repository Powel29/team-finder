import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { TeamCard } from '@/features/teams/team-card.jsx';
import { useMemberDashboard } from '@/features/requests/api.js';

export function RecommendedTeams() {
  const { data, isPending } = useMemberDashboard(true);
  if (isPending) return <Skeleton className="h-40" />;
  if (data.recommendations.length === 0) return null;
  return (
    <section aria-label="Recommended teams" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl">Recommended for you</h2>
        <Link to="/browse?tab=teams&sort=match" className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
          See all matches
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.recommendations.map(({ team, match }) => (
          <TeamCard key={team.id} team={team} bestMatch={match} />
        ))}
      </div>
    </section>
  );
}
