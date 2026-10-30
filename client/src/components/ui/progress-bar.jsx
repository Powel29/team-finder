export function ProgressBar({ value, label, className }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="h-1.5 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-ink transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
