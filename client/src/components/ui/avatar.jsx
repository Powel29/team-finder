import clsx from 'clsx';

const COLORS = [
  'bg-indigo-100',
  'bg-rose-100',
  'bg-orange-100',
  'bg-amber-100',
  'bg-lime-100',
  'bg-emerald-100',
  'bg-teal-100',
  'bg-sky-100',
];

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export function Avatar({ name = '?', size = 'md', className }) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-20 text-2xl' };
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-display font-medium text-slate-800',
        COLORS[hash(name) % COLORS.length],
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
