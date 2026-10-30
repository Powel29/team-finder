import clsx from 'clsx';

export function Card({ as: Tag = 'div', className, interactive = false, children, ...props }) {
  return (
    <Tag
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white p-5',
        interactive && 'transition-colors hover:bg-slate-50',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
