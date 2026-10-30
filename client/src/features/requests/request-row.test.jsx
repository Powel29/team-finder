import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RequestRow } from './request-row.jsx';

const base = {
  id: 'r1',
  type: 'JOIN_REQUEST',
  status: 'PENDING',
  message: 'Hello!',
  matchScore: 82,
  createdAt: new Date().toISOString(),
  team: { id: 't1', name: 'AI Buddy' },
  role: { id: 'ro1', title: 'Frontend' },
  sender: { id: 'u2', name: 'Judy Chen' },
  recipient: { id: 'u1', name: 'Alice Johnson' },
  direction: 'RECEIVED',
};
const show = (over, onAction = vi.fn()) => {
  render(
    <MemoryRouter>
      <ul>
        <RequestRow request={{ ...base, ...over }} onAction={onAction} />
      </ul>
    </MemoryRouter>,
  );
  return onAction;
};

describe('RequestRow', () => {
  it('lets the recipient accept or decline a pending join request', async () => {
    const onAction = show({});
    expect(screen.getByText(/asked to join/)).toBeInTheDocument();
    expect(screen.getByText('82% match')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAction).toHaveBeenCalledWith('accept', 'r1');
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onAction).toHaveBeenCalledWith('decline', 'r1');
  });

  it('lets the sender cancel a pending request and shows no accept button', async () => {
    const onAction = show({ direction: 'SENT' });
    expect(screen.getByText(/You asked to join/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onAction).toHaveBeenCalledWith('cancel', 'r1');
  });

  it('words invites by direction', () => {
    show({ type: 'INVITE', direction: 'RECEIVED', sender: { id: 'u3', name: 'Erin Park' } });
    expect(screen.getByText(/invited you to/)).toBeInTheDocument();
  });

  it('is read-only once handled', () => {
    show({ status: 'ACCEPTED' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });
});
