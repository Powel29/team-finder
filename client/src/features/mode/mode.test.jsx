import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/render.jsx';
import { ModeSwitch } from './mode-switch.jsx';

describe('ModeSwitch', () => {
  it('defaults to member, toggles and persists to localStorage', async () => {
    renderApp(<ModeSwitch />);
    expect(screen.getByRole('radio', { name: 'Member' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Team owner' }));
    expect(screen.getByRole('radio', { name: 'Team owner' })).toBeChecked();
    expect(localStorage.getItem('tf_mode')).toBe('owner');
  });

  it('restores the stored mode', () => {
    localStorage.setItem('tf_mode', 'owner');
    renderApp(<ModeSwitch />);
    expect(screen.getByRole('radio', { name: 'Team owner' })).toBeChecked();
  });
});
