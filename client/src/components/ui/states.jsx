import { AlertTriangle } from 'lucide-react';
import { Button } from './button.jsx';

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {Icon && (
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <AlertTriangle className="mb-3 size-8 text-danger" aria-hidden />
      <h3 className="text-lg font-bold text-red-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-red-800">{error?.message ?? 'Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageSpinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center">
      <div className="size-9 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
