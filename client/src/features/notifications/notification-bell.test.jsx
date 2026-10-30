import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/render.jsx';
import { api } from '@/lib/api.js';
import { NotificationBell } from './notification-bell.jsx';

vi.mock('@/lib/api.js', async (orig) => ({ ...(await orig()), api: vi.fn() }));

const notification = (over = {}) => ({
  id: 'n1',
  type: 'REQUEST_RECEIVED',
  title: 'New join request',
  body: 'Judy wants to join Frontend',
  link: '/dashboard',
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe('NotificationBell', () => {
  it('shows the unread count, lists notifications and marks one read on click', async () => {
    let unread = 2;
    api.mockImplementation(async (path) => {
      if (path === '/api/notifications/unread-count') return { count: unread };
      if (path.startsWith('/api/notifications/n1/read')) {
        unread = 1;
        return { count: 1 };
      }
      return {
        items: [
          notification(),
          notification({ id: 'n2', title: 'Old', body: 'Something old', readAt: new Date().toISOString() }),
        ],
        page: 1,
        totalPages: 1,
        total: 2,
      };
    });
    renderApp(<NotificationBell />);
    const bell = await screen.findByRole('button', { name: 'Notifications, 2 unread' });
    expect(bell).toHaveTextContent('2');

    await userEvent.click(bell);
    expect(await screen.findByText('Judy wants to join Frontend')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /New join request/ }));
    expect(api).toHaveBeenCalledWith('/api/notifications/n1/read', { method: 'POST' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument());
  });

  it('hides the badge when everything is read', async () => {
    api.mockResolvedValue({ count: 0 });
    renderApp(<NotificationBell />);
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });
});
