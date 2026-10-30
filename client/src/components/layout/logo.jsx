import { Link } from 'react-router-dom';

export function Logo({ to = '/' }) {
  return (
    <Link
      to={to}
      aria-label="Team Finder home"
      className="flex items-center gap-2 font-display text-lg font-extrabold text-slate-900"
    >
      <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-xl bg-brand-600 text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
          <circle cx="9" cy="9" r="3.2" />
          <circle cx="16.5" cy="10" r="2.4" className="fill-accent" />
          <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6zM14 19c0-2.4 1.6-4.4 3.7-4.4S21 16.6 21 19z" />
        </svg>
      </span>
      <span className="hidden min-[420px]:inline">Team Finder</span>
    </Link>
  );
}
