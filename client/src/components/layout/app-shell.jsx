import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, LogOut, Menu, MessageSquare, Plus, Search, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button, Drawer } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { useMode } from '@/features/mode/mode-context.jsx';
import { ModeSwitch } from '@/features/mode/mode-switch.jsx';
import { useChatUnread } from '@/features/chat/hooks.js';
import { NotificationBell } from '@/features/notifications/notification-bell.jsx';
import { useMyTeams } from '@/features/teams/api.js';
import { Logo } from './logo.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/browse', label: 'Browse', icon: Search },
  { to: '/teams', label: 'My teams', mobileLabel: 'Teams', icon: Users, end: true },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
];

const sideLinkClass = ({ isActive }) =>
  clsx(
    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-brand-600 font-medium text-white' : 'text-slate-700 hover:bg-slate-200/60',
  );

const teamLinkClass = ({ isActive }) =>
  clsx(
    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-slate-200/70 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-200/60',
  );

function UnreadBadge({ count, className }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread chat messages`}
      className={clsx(
        'min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white',
        className,
      )}
    >
      {count}
    </span>
  );
}

function YourTeams({ onNavigate }) {
  const { data } = useMyTeams();
  const teams = data ? [...data.owned, ...data.joined] : [];
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between px-3 text-xs text-slate-600">
        <span>Your teams</span>
        <Link
          to="/teams/new"
          onClick={onNavigate}
          aria-label="Create team"
          className="rounded p-0.5 hover:bg-slate-200/60"
        >
          <Plus className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-1.5 space-y-0.5" aria-label="Your teams">
        {teams.map((team) => (
          <li key={team.id}>
            <NavLink to={`/teams/${team.id}`} onClick={onNavigate} className={teamLinkClass}>
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm bg-accent" />
              <span className="truncate">{team.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarBody({ chatUnread, onNavigate }) {
  return (
    <>
      <nav aria-label="Main">
        <ul className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} onClick={onNavigate} className={sideLinkClass}>
                <Icon className="size-4" aria-hidden />
                {label}
                {to === '/chat' && <UnreadBadge count={chatUnread} className="ml-auto" />}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <YourTeams onNavigate={onNavigate} />
    </>
  );
}

function AccountBlock({ user, onLogout, onNavigate }) {
  return (
    <div className="flex items-center gap-1 border-t border-slate-200 pt-3">
      <Link
        to="/profile"
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-200/60"
      >
        <Avatar name={user.name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium leading-tight text-slate-900">{user.name}</span>
          <span className="block truncate text-xs leading-tight text-slate-600">{user.email}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Log out"
        title="Log out"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-200/60"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { isOwner } = useMode();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const chatUnread = Object.values(useChatUnread()).reduce((sum, n) => sum + n, 0);
  const subtitle = isOwner ? 'Managing teams' : 'Looking for a team';

  const onLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-ground pb-16 lg:grid lg:grid-cols-[228px_1fr] lg:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen flex-col px-3 pb-3 pt-3 lg:flex">
        <div className="mb-5 px-2">
          <Logo to="/dashboard" subtitle={subtitle} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarBody chatUnread={chatUnread} />
        </div>
        <AccountBlock user={user} onLogout={onLogout} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 px-3 lg:px-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-200/60 lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="lg:hidden">
            <Logo to="/dashboard" />
          </div>
          <Link
            to="/browse"
            className="hidden h-9 items-center gap-2 rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-200/60 lg:inline-flex"
          >
            <Search className="size-4" aria-hidden />
            Search people and teams
          </Link>
          <NotificationBell />
          <div className="ml-auto flex items-center gap-2">
            <ModeSwitch />
            <div className="hidden sm:block">
              <Button
                size="sm"
                icon={isOwner ? Plus : Search}
                onClick={() => navigate(isOwner ? '/teams/new' : '/browse?tab=teams')}
              >
                {isOwner ? 'Create team' : 'Find a team'}
              </Button>
            </div>
          </div>
        </header>

        <main
          id="main"
          className="mx-2 mb-2 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6 lg:ml-0 lg:mr-2"
        >
          <Outlet />
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <div className="flex h-[calc(100%-4rem)] flex-col">
          <div className="flex-1 overflow-y-auto">
            <SidebarBody chatUnread={chatUnread} onNavigate={() => setMenuOpen(false)} />
          </div>
          <AccountBlock
            user={user}
            onNavigate={() => setMenuOpen(false)}
            onLogout={() => {
              setMenuOpen(false);
              onLogout();
            }}
          />
        </div>
      </Drawer>

      <nav
        aria-label="Mobile"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden"
      >
        {[
          ...NAV.slice(0, 3).map((n) => ({ ...n, label: n.mobileLabel ?? n.label })),
          NAV[3],
          { to: '/profile', label: 'Me', icon: User },
        ].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                isActive ? 'text-slate-900' : 'text-slate-600',
              )
            }
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden />
              {to === '/chat' && <UnreadBadge count={chatUnread} className="absolute -right-2 -top-1.5" />}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
