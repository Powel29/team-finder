import { Link } from 'react-router-dom';
import { Card, ProgressBar } from '@/components/ui';
import { DashboardRail } from '@/features/dashboard/dashboard-rail.jsx';
import { OwnerPanels } from '@/features/dashboard/owner-panels.jsx';
import { RecommendedTeams } from '@/features/dashboard/recommended-teams.jsx';
import { RequestTabs } from '@/features/dashboard/request-tabs.jsx';
import { useMode } from '@/features/mode/mode-context.jsx';
import { useMyProfile } from '@/features/profile/api.js';
import { useDashboardSummary } from '@/features/requests/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function ProfileNudge() {
  const profile = useMyProfile();
  if (profile.isPending || profile.error) return null;
  const completeness = profile.data?.completeness ?? 0;
  if (completeness >= 100) return null;
  return (
    <Card className="p-4">
      <ProgressBar value={completeness} label="Profile completeness" />
      <p className="mt-3 text-sm text-slate-700">
        {profile.data
          ? 'Finish your profile to get better matches.'
          : 'Create your profile to start matching with teams.'}{' '}
        <Link to={profile.data ? '/profile' : '/onboarding'} className="font-medium text-slate-900 underline">
          {profile.data ? 'Edit profile' : 'Set up profile'}
        </Link>
      </p>
    </Card>
  );
}

function StatusLine({ isOwner }) {
  const { data } = useDashboardSummary();
  if (!data) return <p className="mt-1 text-sm text-slate-600">&nbsp;</p>;
  const parts = isOwner
    ? [`${plural(data.pendingReceived, 'request')} waiting on your answer`, plural(data.ownedTeams, 'team') + ' owned']
    : [`${plural(data.pendingReceived, 'request')} waiting on your answer`, `${plural(data.pendingSent, 'request')} sent`];
  return <p className="mt-1 text-sm text-slate-600">{parts.join(' · ')}</p>;
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { isOwner } = useMode();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Dashboard</h1>
        <StatusLine isOwner={isOwner} />
      </div>
      <ProfileNudge />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {isOwner ? (
            <>
              <OwnerPanels />
              <RequestTabs initial="sent" />
            </>
          ) : (
            <>
              <RecommendedTeams />
              <RequestTabs initial="received" />
            </>
          )}
        </div>
        <DashboardRail />
      </div>
    </div>
  );
}
