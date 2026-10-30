import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { AppProviders } from '@/providers.jsx';

export const testClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });

/** Renders with router + query + auth + mode providers. Seed `me` to skip the network. */
export function renderApp(ui, { route = '/', me = null, client = testClient() } = {}) {
  client.setQueryData(['me'], me);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders client={client}>{ui}</AppProviders>
    </MemoryRouter>,
  );
}

export const demoMe = {
  user: { id: 'u1', name: 'Alice Johnson', email: 'alice@demo.dev' },
  hasMemberProfile: true,
  unreadNotifications: 0,
  ownedTeamCount: 0,
};
