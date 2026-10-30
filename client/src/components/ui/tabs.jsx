import clsx from 'clsx';

/** Accessible tab strip. Panels are rendered by the caller based on `value`. */
export function Tabs({ tabs, value, onChange, label = 'Sections', className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={clsx('flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1', className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          id={`tab-${tab.value}`}
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
            value === tab.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl({ options, value, onChange, label, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-label={opt.shortLabel ? opt.label : undefined}
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'rounded-lg font-semibold transition-colors',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === opt.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {opt.shortLabel ? (
            <>
              <span className="sm:hidden">{opt.shortLabel}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </>
          ) : (
            opt.label
          )}
        </button>
      ))}
    </div>
  );
}
