import clsx from 'clsx';
import { X } from 'lucide-react';

const TONES = {
  slate: 'border border-slate-300 bg-white text-slate-700',
  brand: 'bg-brand-50 text-brand-800',
  success: 'bg-emerald-50 text-emerald-900',
  warning: 'bg-amber-50 text-amber-900',
  danger: 'bg-red-50 text-red-900',
  accent: 'bg-amber-50 text-amber-900',
};

const CHIP_TONES = { ...TONES, slate: 'bg-slate-100 text-slate-700' };

export function Badge({ tone = 'slate', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
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
        'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium',
        CHIP_TONES[tone],
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
