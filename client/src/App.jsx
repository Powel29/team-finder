import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/app-shell.jsx';
import { ServerWakingBanner } from '@/components/layout/server-waking-banner.jsx';
import { PublicOnly, RequireAuth } from '@/features/auth/require-auth.jsx';
import LandingPage from '@/pages/landing.jsx';
import LoginPage from '@/pages/login.jsx';
import RegisterPage from '@/pages/register.jsx';
import OnboardingPage from '@/pages/onboarding.jsx';
import ProfilePage from '@/pages/profile.jsx';
import DashboardPage from '@/pages/dashboard.jsx';
import BrowsePage from '@/pages/browse.jsx';
import PersonDetailPage from '@/pages/person-detail.jsx';
import TeamsPage from '@/pages/teams.jsx';
import TeamNewPage from '@/pages/team-new.jsx';
import TeamManagePage from '@/pages/team-manage.jsx';
import TeamDetailPage from '@/pages/team-detail.jsx';
import NotificationsPage from '@/pages/notifications.jsx';
import ChatPage, { ChatIndexPage } from '@/pages/chat.jsx';
import NotFoundPage from '@/pages/not-found.jsx';

export default function App() {
  return (
    <>
      <ServerWakingBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/people/:userId" element={<PersonDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/new" element={<TeamNewPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />
            <Route path="/teams/:id/manage" element={<TeamManagePage />} />
            <Route path="/teams/:id/chat" element={<ChatPage />} />
            <Route path="/chat" element={<ChatIndexPage />} />
          </Route>
        </Route>
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
