import { SegmentedControl } from '@/components/ui';
import { useMode } from './mode-context.jsx';

export function ModeSwitch() {
  const { mode, setMode } = useMode();
  return (
    <SegmentedControl
      label="Active mode"
      size="sm"
      value={mode}
      onChange={setMode}
      options={[
        { value: 'member', label: 'Member' },
        { value: 'owner', label: 'Team owner', shortLabel: 'Owner' },
      ]}
    />
  );
}
