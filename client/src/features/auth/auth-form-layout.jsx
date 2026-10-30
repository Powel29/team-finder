import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/logo.jsx';

export function AuthFormLayout({ title, subtitle, children, footer }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-600">{subtitle}</p>
        {children}
      </div>
      <p className="mt-6 text-sm text-slate-600">{footer}</p>
      <Link to="/" className="mt-3 text-sm font-medium text-slate-900 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
