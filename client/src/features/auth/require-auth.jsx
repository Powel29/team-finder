import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState, PageSpinner } from '@/components/ui';
import { SocketProvider } from '@/features/realtime/socket-provider.jsx';
import { useAuth } from './auth-context.jsx';

export function RequireAuth() {
  const { user, isLoading, error, retry } = useAuth();
  const location = useLocation();
  if (isLoading) return <PageSpinner label="Checking your session" />;
  if (error) return <ErrorState error={error} onRetry={retry} title="Could not verify your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return (
    <SocketProvider>
      <Outlet />
    </SocketProvider>
  );
}

/** Login and register are for signed-out visitors only. */
export function PublicOnly() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
