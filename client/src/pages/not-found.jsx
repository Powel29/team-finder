import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Logo } from '@/components/layout/logo.jsx';
import { usePageTitle } from '@/hooks/use-page-title.js';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <span className="mt-10 inline-flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Compass className="size-8" aria-hidden />
      </span>
      <h1 className="mt-5 text-3xl">Page not found</h1>
      <p className="mt-2 max-w-md text-slate-600">The page you are looking for does not exist or has moved.</p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Back to home
      </Link>
    </main>
  );
}
