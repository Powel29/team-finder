import { Select } from '@/components/ui';
import { useMyTeams } from '@/features/teams/api.js';

/** Lets an owner rank people against one of their open roles. */
export function RoleContextSelect({ value, onChange }) {
  const { data } = useMyTeams();
  const options = (data?.owned ?? []).flatMap((team) =>
    team.roles.filter((r) => r.open > 0).map((r) => ({ id: r.id, label: `${team.name} › ${r.title}` })),
  );
  if (!data || options.length === 0) return null;
  return (
    <Select label="Rank by role" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No role (newest first)</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
