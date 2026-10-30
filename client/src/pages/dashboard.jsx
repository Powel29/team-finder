import { Link } from 'react-router-dom';
import { Card, ProgressBar } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { OwnerPanels } from '@/features/dashboard/owner-panels.jsx';
import { RecommendedTeams } from '@/features/dashboard/recommended-teams.jsx';
import { RequestTabs } from '@/features/dashboard/request-tabs.jsx';
import { SummaryCards } from '@/features/dashboard/summary-cards.jsx';
import { useMode } from '@/features/mode/mode-context.jsx';
import { useMyProfile } from '@/features/profile/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

function ProfileNudge() {
  const profile = useMyProfile();
  if (profile.isPending || profile.error) return null;
  const completeness = profile.data?.completeness ?? 0;
  if (completeness >= 100) return null;
  return (
    <Card className="border-brand-200 bg-brand-50">
      <ProgressBar value={completeness} label="Profile completeness" />
      <p className="mt-3 text-sm text-slate-700">
        {profile.data
          ? 'Finish your profile to get better matches.'
          : 'Create your profile to start matching with teams.'}{' '}
        <Link to={profile.data ? '/profile' : '/onboarding'} className="font-semibold text-brand-700 hover:underline">
          {profile.data ? 'Edit profile' : 'Set up profile'}
        </Link>
      </p>
    </Card>
  );
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const { isOwner } = useMode();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Hi {user.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-slate-600">
          {isOwner
            ? 'Manage your teams, requests and the people you want to invite.'
            : 'Track your applications and invites, and find teams that fit you.'}
        </p>
      </div>
      <ProfileNudge />
      <SummaryCards />
      {isOwner ? (
        <>
          <OwnerPanels />
          <RequestTabs initial="sent" />
        </>
      ) : (
        <>
          <RequestTabs initial="received" />
          <RecommendedTeams />
        </>
      )}
    </div>
  );
}
