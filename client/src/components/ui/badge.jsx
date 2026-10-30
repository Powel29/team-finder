import clsx from 'clsx';
import { X } from 'lucide-react';

const TONES = {
  slate: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  accent: 'bg-amber-100 text-amber-900',
};

export function Badge({ tone = 'slate', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Skill/interest chip; becomes removable when onRemove is passed. */
export function Chip({ children, tone = 'slate', onRemove, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${children}`}
          className="rounded p-0.5 hover:bg-black/10"
        >
          <X className="size-3" aria-hidden />
        </button>
      )}
    </span>
  );
}
