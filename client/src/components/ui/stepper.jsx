import { Minus, Plus } from 'lucide-react';
import { IconButton } from './button.jsx';

/** Numeric +/- control that respects min and max. */
export function Stepper({ label, value, onChange, min = 1, max = 10 }) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1.5">
      <IconButton
        label={`Decrease ${label}`}
        icon={Minus}
        variant="outline"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="size-9"
      />
      <output aria-live="polite" className="w-8 text-center text-sm font-semibold">
        {value}
      </output>
      <IconButton
        label={`Increase ${label}`}
        icon={Plus}
        variant="outline"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="size-9"
      />
    </div>
  );
}
