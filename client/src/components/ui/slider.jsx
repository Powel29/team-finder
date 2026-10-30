import { useId } from 'react';

/** Range input with a live numeric readout. */
export function Slider({ label, value, onChange, min = 0, max = 40, step = 1, unit = 'h/week', className }) {
  const id = useId();
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <label htmlFor={id} className="font-medium text-slate-700">
          {label}
        </label>
        <output htmlFor={id} className="font-semibold text-brand-700">
          {value} {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600"
      />
    </div>
  );
}
