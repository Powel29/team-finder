import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MatchRing } from './match-ring.jsx';
import { SkillCombobox } from './skill-combobox.jsx';
import { testClient } from '@/test/render.jsx';
import { api } from '@/lib/api.js';

vi.mock('@/lib/api.js', async (orig) => ({ ...(await orig()), api: vi.fn() }));

describe('MatchRing', () => {
  it.each([
    [92, 'excellent'],
    [75, 'strong'],
    [55, 'decent'],
    [10, 'low'],
  ])('shows %i%% with the %s tier', (score, tier) => {
    render(<MatchRing score={score} />);
    expect(screen.getByText(`${score}%`)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('data-tier', tier);
  });
});

describe('SkillCombobox', () => {
  const renderBox = (props) => {
    const onChange = vi.fn();
    render(
      <QueryClientProvider client={testClient()}>
        <SkillCombobox label="Skills" selected={[]} onChange={onChange} {...props} />
      </QueryClientProvider>,
    );
    return onChange;
  };

  it('adds a catalogue skill and removes a selected chip', async () => {
    api.mockResolvedValue({ items: [{ id: 's1', name: 'React' }] });
    const onChange = renderBox();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'React' }));
    expect(onChange).toHaveBeenCalledWith([{ id: 's1', name: 'React' }]);
  });

  it('removes a chip', async () => {
    api.mockResolvedValue({ items: [] });
    const onChange = renderBox({ selected: [{ id: 's1', name: 'React' }] });
    await userEvent.click(screen.getByRole('button', { name: 'Remove React' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('creates a new skill when allowed', async () => {
    api.mockImplementation(async (path, opts) => (opts?.method === 'POST' ? { id: 's9', name: 'Zig' } : { items: [] }));
    const onChange = renderBox({ allowCreate: true });
    await userEvent.type(screen.getByRole('combobox'), 'Zig');
    await userEvent.click(await screen.findByRole('option', { name: /Add “Zig”/ }));
    expect(onChange).toHaveBeenCalledWith([{ id: 's9', name: 'Zig' }]);
  });
});
