import clsx from 'clsx';

/** Accessible underline tab strip. Panels are rendered by the caller based on `value`. */
export function Tabs({ tabs, value, onChange, label = 'Sections', className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={clsx('flex gap-5 overflow-x-auto overflow-y-hidden border-b border-slate-200', className)}
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
            '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 py-2.5 text-sm transition-colors',
            value === tab.value
              ? 'border-ink font-semibold text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900',
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="text-xs font-normal text-slate-600">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl({ options, value, onChange, label, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-label={opt.shortLabel ? opt.label : undefined}
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === opt.value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
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
