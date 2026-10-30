import { useId, useState } from 'react';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { Chip } from './badge.jsx';
import { useDebouncedValue } from '@/hooks/use-debounced-value.js';
import { createSkill, useSkillSearch } from '@/features/skills/api.js';
import { toast } from 'sonner';

/**
 * Multi-select skill picker with search and create-new.
 * @param {{ selected: {id: string, name: string}[], onChange: (skills: {id: string, name: string}[]) => void }} props
 */
export function SkillCombobox({
  label,
  selected,
  onChange,
  allowCreate = false,
  max = 30,
  placeholder = 'Search skills…',
  hint,
  tone = 'slate',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputId = useId();
  const debounced = useDebouncedValue(query, 200);
  const { data: results = [], isFetching } = useSkillSearch(debounced);

  const chosen = new Set(selected.map((s) => s.id));
  const trimmed = query.trim();
  const options = results
    .filter((s) => !chosen.has(s.id))
    .slice(0, 8)
    .map((s) => ({ type: 'skill', skill: s }));
  const exact = results.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  if (allowCreate && trimmed && !exact && debounced === query) options.push({ type: 'create', name: trimmed });

  const atMax = selected.length >= max;

  const reset = () => {
    setQuery('');
    setActive(0);
  };

  const choose = async (option) => {
    if (!option || atMax) return;
    if (option.type === 'skill') {
      onChange([...selected, option.skill]);
    } else {
      try {
        const skill = await createSkill(option.name);
        if (!chosen.has(skill.id)) onChange([...selected, skill]);
      } catch (err) {
        toast.error(err.message);
      }
    }
    reset();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && options[active]) choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && !query && selected.length) {
      onChange(selected.slice(0, -1));
    }
  };

  return (
    <div className="relative">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        value={query}
        disabled={atMax}
        placeholder={atMax ? `Maximum of ${max} reached` : placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm placeholder:text-slate-500 focus:border-ink focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
      />
      {hint && <p className="mt-1.5 text-xs text-slate-600">{hint}</p>}
      {open && (options.length > 0 || isFetching) && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label ?? 'Skills'}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          {options.map((option, i) => (
            <li
              key={option.type === 'skill' ? option.skill.id : `create-${option.name}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
              className={clsx(
                'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
                i === active ? 'bg-slate-100 text-slate-900' : 'text-slate-700',
              )}
            >
              {option.type === 'create' ? (
                <>
                  <Plus className="size-4" aria-hidden /> Add “{option.name}”
                </>
              ) : (
                option.skill.name
              )}
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {selected.map((s) => (
            <Chip key={s.id} tone={tone} onRemove={() => onChange(selected.filter((x) => x.id !== s.id))}>
              {s.name}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
