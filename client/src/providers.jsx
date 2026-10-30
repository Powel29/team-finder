import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/auth-context.jsx';
import { ModeProvider } from '@/features/mode/mode-context.jsx';

export function AppProviders({ client, children }) {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ModeProvider>{children}</ModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
