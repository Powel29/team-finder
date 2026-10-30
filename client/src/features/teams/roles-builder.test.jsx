import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { RolesBuilder } from './roles-builder.jsx';
import { emptyTeam } from './team-form-schema.js';
import { testClient } from '@/test/render.jsx';

function Harness() {
  const { control, register, formState } = useForm({ defaultValues: emptyTeam() });
  return (
    <QueryClientProvider client={testClient()}>
      <RolesBuilder control={control} register={register} errors={formState.errors} />
    </QueryClientProvider>
  );
}

describe('RolesBuilder', () => {
  it('adds and removes roles, and never removes the last one', async () => {
    render(<Harness />);
    expect(screen.getAllByRole('group', { name: /slots for role/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Remove role/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add another role' }));
    expect(screen.getAllByRole('group', { name: /slots for role/ })).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Remove role 2' }));
    expect(screen.getAllByRole('group', { name: /slots for role/ })).toHaveLength(1);
  });

  it('keeps the slot stepper within 1 and 10', async () => {
    render(<Harness />);
    const group = screen.getByRole('group', { name: 'slots for role 1' });
    const dec = screen.getByRole('button', { name: 'Decrease slots for role 1' });
    const inc = screen.getByRole('button', { name: 'Increase slots for role 1' });
    expect(dec).toBeDisabled();
    for (let i = 0; i < 12; i += 1) if (!inc.disabled) await userEvent.click(inc);
    expect(group).toHaveTextContent('10');
    expect(inc).toBeDisabled();
    await userEvent.click(dec);
    expect(group).toHaveTextContent('9');
  });
});
