import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, Search, Target, UserPlus } from 'lucide-react';
import { Logo } from '@/components/layout/logo.jsx';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { Badge, Chip, Skeleton } from '@/components/ui';
import { useFeaturedTeams, usePublicStats } from '@/features/public/api.js';
import { typeLabel } from '@/lib/constants.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Build your profile',
    text: 'List your skills, level and weekly availability so teams know what you bring.',
  },
  {
    icon: Target,
    title: 'See your match',
    text: 'Every role shows a transparent match percentage with the skills you have and the ones you lack.',
  },
  {
    icon: MessageSquare,
    title: 'Team up and chat',
    text: 'Send or accept requests, get live notifications and chat with your team in one place.',
  },
];

function StatsStrip() {
  const { data } = usePublicStats();
  const items = [
    ['Students looking', data?.members],
    ['Open teams', data?.openTeams],
    ['Open roles', data?.openRoles],
  ];
  return (
    <ul aria-label="Platform statistics" className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-4">
      {items.map(([label, value]) => (
        <li key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="block font-display text-3xl font-extrabold text-brand-700">
            {value ?? <Skeleton className="mx-auto h-8 w-10" />}
          </span>
          <span className="mt-1 block text-xs font-medium text-slate-600">{label}</span>
        </li>
      ))}
    </ul>
  );
}

function FeaturedTeams() {
  const { data, isPending, error } = useFeaturedTeams();
  if (error || (data && data.length === 0)) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6" aria-labelledby="featured">
      <h2 id="featured" className="mb-8 text-center text-3xl font-extrabold">
        Teams recruiting right now
      </h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isPending
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-40" />
              </li>
            ))
          : data.map((team) => (
              <li
                key={team.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <Badge tone="brand">{typeLabel(team.type)}</Badge>
                <h3 className="mt-2 text-lg font-bold">
                  <Link to={`/teams/${team.id}`} className="hover:text-brand-700">
                    {team.name}
                  </Link>
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {team.techStack.slice(0, 4).map((s) => (
                    <Chip key={s.id}>{s.name}</Chip>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-brand-700">
                  {team.openSlots} open slot{team.openSlots === 1 ? '' : 's'}
                </p>
              </li>
            ))}
      </ul>
    </section>
  );
}

export default function LandingPage() {
  usePageTitle();
  const { user } = useAuth();
  return (
    <div>
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Account">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-20">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <Search className="size-4" aria-hidden /> Hackathons · startups · open source · course projects
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
            Find your hackathon <span className="text-brand-600">dream team</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Team Finder connects students who want to build with teams that need exactly their skills. Browse people and
            teams, see how well you match, and start building together.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Get started <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/browse?tab=teams"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Browse teams
            </Link>
          </div>
          <StatsStrip />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6" aria-labelledby="how">
          <h2 id="how" className="mb-8 text-center text-3xl font-extrabold">
            How it works
          </h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="text-lg font-bold">
                  {i + 1}. {title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <FeaturedTeams />
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-600">
        Team Finder · built for students who build together
      </footer>
    </div>
  );
}
