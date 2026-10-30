import { useId } from 'react';
import clsx from 'clsx';

const control =
  'w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100';

/** Label + control + hint/error, wired with aria attributes. */
export function Field({ label, error, hint, children, className }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
      })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ label, error, hint, className, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => (
        <input {...a11y} className={clsx(control, 'h-11', error ? 'border-danger' : 'border-slate-200')} {...props} />
      )}
    </Field>
  );
}

export function Textarea({ label, error, hint, className, rows = 4, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => (
        <textarea
          {...a11y}
          rows={rows}
          className={clsx(control, 'py-2.5', error ? 'border-danger' : 'border-slate-200')}
          {...props}
        />
      )}
    </Field>
  );
}

export function Select({ label, error, hint, className, children, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => (
        <select {...a11y} className={clsx(control, 'h-11', error ? 'border-danger' : 'border-slate-200')} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}
