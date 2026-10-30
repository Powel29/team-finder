import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { demoMe, renderApp } from '@/test/render.jsx';
import { api } from '@/lib/api.js';
import BrowsePage from './browse.jsx';

vi.mock('@/lib/api.js', async (orig) => ({ ...(await orig()), api: vi.fn() }));

const Location = () => <output data-testid="url">{useLocation().search}</output>;
const empty = { items: [], page: 1, pageSize: 12, total: 0, totalPages: 1 };

describe('BrowsePage', () => {
  it('syncs search text and filters to the URL and offers to clear them', async () => {
    api.mockResolvedValue(empty);
    renderApp(
      <>
        <BrowsePage />
        <Location />
      </>,
      { route: '/browse?tab=people', me: demoMe },
    );
    await userEvent.type(screen.getAllByLabelText('Search people')[0], 'react');
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('q=react'));
    await userEvent.click(screen.getAllByLabelText('Beginner')[0]);
    expect(screen.getByTestId('url')).toHaveTextContent('level=BEGINNER');
    expect(await screen.findByText('No people match these filters')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent(/^\?tab=people$/));
  });

  it('reads filters from a shared URL and queries the API with them', async () => {
    api.mockResolvedValue(empty);
    renderApp(<BrowsePage />, { route: '/browse?tab=teams&q=climate&type=HACKATHON&sort=deadline', me: demoMe });
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/teams\?.*q=climate/)));
    const call = api.mock.calls.map(([path]) => path).find((p) => p.startsWith('/api/teams'));
    expect(call).toContain('type=HACKATHON');
    expect(call).toContain('sort=deadline');
    expect(screen.getAllByLabelText('Hackathon')[0]).toBeChecked();
  });
});
