import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { SegmentedControl, Slider } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/use-debounced-value.js';

/** Search box that writes to the URL 300 ms after the user stops typing. */
export function SearchInput({ value, onChange, placeholder, label }) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  const debounced = useDebouncedValue(draft, 300);

  // Follow external URL changes (e.g. "Clear filters") without clobbering what the user is typing.
  if (value !== seen) {
    setSeen(value);
    if (value !== draft.trim()) setDraft(value);
  }

  useEffect(() => {
    if (debounced.trim() !== value) onChange(debounced.trim());
    // Only react to the debounced draft; `value` changes come from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div>
      <label htmlFor="browse-search" className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          id="browse-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        {draft && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setDraft('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export function CheckboxGroup({ legend, options, values, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">{legend}</legend>
      <div className="space-y-1.5">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.includes(o.value)}
              onChange={() =>
                onChange(values.includes(o.value) ? values.filter((v) => v !== o.value) : [...values, o.value])
              }
              className="size-4 rounded border-slate-300 accent-brand-600"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MinHoursSlider({ value, onChange }) {
  const current = Number(value) || 0;
  const [draft, setDraft] = useState(current);
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    if (current !== draft) setDraft(current);
  }
  const debounced = useDebouncedValue(draft, 300);
  useEffect(() => {
    if (debounced !== current) onChange(debounced || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return <Slider label="Minimum availability" value={draft} onChange={setDraft} min={0} max={40} step={1} />;
}

export function SkillModeToggle({ value, onChange }) {
  return (
    <SegmentedControl
      label="Skill match mode"
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: 'any', label: 'Match any' },
        { value: 'all', label: 'Match all' },
      ]}
    />
  );
}
