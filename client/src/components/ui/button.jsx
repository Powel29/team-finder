import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-slate-700',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-danger text-white hover:bg-red-800',
  success: 'bg-success text-white hover:bg-emerald-900',
};
const SIZES = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className="size-4" aria-hidden />
      )}
      {children}
    </button>
  );
}

export function IconButton({ label, icon: Icon, className, variant = 'ghost', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-10 items-center justify-center rounded-lg transition-colors disabled:opacity-60',
        variant === 'ghost'
          ? 'text-slate-600 hover:bg-slate-100'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        className,
      )}
      {...props}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
