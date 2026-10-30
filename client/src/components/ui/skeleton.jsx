import clsx from 'clsx';

export const Skeleton = ({ className }) => (
  <div aria-hidden className={clsx('animate-pulse rounded-lg bg-slate-200', className)} />
);

export function CardSkeletons({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
