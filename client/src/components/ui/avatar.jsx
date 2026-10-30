import clsx from 'clsx';

const COLORS = [
  'bg-indigo-700',
  'bg-violet-700',
  'bg-fuchsia-700',
  'bg-rose-700',
  'bg-orange-700',
  'bg-emerald-700',
  'bg-teal-700',
  'bg-sky-700',
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
        'inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white',
        COLORS[hash(name) % COLORS.length],
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
