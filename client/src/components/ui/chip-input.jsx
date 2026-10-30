import { useState } from 'react';
import { Chip } from './badge.jsx';
import { Field } from './form-fields.jsx';

/** Free-text tag input: Enter or comma adds, Backspace on empty removes the last. */
export function ChipInput({ label, values, onChange, placeholder = 'Type and press Enter', max = 15, hint }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const next = draft.trim();
    if (next && values.length < max && !values.some((v) => v.toLowerCase() === next.toLowerCase()))
      onChange([...values, next]);
    setDraft('');
  };

  return (
    <Field label={label} hint={hint}>
      {(a11y) => (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-200">
          {values.map((v) => (
            <Chip key={v} tone="brand" onRemove={() => onChange(values.filter((x) => x !== v))}>
              {v}
            </Chip>
          ))}
          <input
            {...a11y}
            value={draft}
            placeholder={values.length >= max ? `Max ${max} reached` : placeholder}
            disabled={values.length >= max}
            onChange={(e) => setDraft(e.target.value.replace(',', ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add();
              } else if (e.key === 'Backspace' && !draft && values.length) {
                onChange(values.slice(0, -1));
              }
            }}
            onBlur={add}
            className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-slate-500"
          />
        </div>
      )}
    </Field>
  );
}
