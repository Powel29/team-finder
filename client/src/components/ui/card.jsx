import clsx from 'clsx';

export function Card({ as: Tag = 'div', className, interactive = false, children, ...props }) {
  return (
    <Tag
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
        interactive && 'transition-shadow hover:shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
