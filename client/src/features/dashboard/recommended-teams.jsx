import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { TeamCard } from '@/features/teams/team-card.jsx';
import { useMemberDashboard } from '@/features/requests/api.js';

export function RecommendedTeams() {
  const { data, isPending } = useMemberDashboard(true);
  if (isPending) return <Skeleton className="h-40" />;
  if (data.recommendations.length === 0) return null;
  return (
    <section aria-label="Recommended teams" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="size-5 text-accent" aria-hidden /> Recommended for you
        </h2>
        <Link to="/browse?tab=teams&sort=match" className="text-sm font-semibold text-brand-700 hover:underline">
          See more
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.recommendations.map(({ team, match }) => (
          <TeamCard key={team.id} team={team} bestMatch={match} />
        ))}
      </div>
    </section>
  );
}
