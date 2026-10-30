import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, LogOut, MessageSquare, Plus, Search, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button, Dropdown, MenuItem } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { useMode } from '@/features/mode/mode-context.jsx';
import { ModeSwitch } from '@/features/mode/mode-switch.jsx';
import { useChatUnread } from '@/features/chat/hooks.js';
import { NotificationBell } from '@/features/notifications/notification-bell.jsx';
import { Logo } from './logo.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/browse', label: 'Browse', icon: Search },
  { to: '/teams', label: 'My Teams', mobileLabel: 'Teams', icon: Users, end: true },
];

const linkClass = ({ isActive }) =>
  clsx(
    'rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
  );

export function AppShell() {
  const { user, logout } = useAuth();
  const { isOwner } = useMode();
  const navigate = useNavigate();
  const chatUnread = Object.values(useChatUnread()).reduce((sum, n) => sum + n, 0);

  const onLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo to="/dashboard" />
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/chat" className={linkClass}>
              Chat
              {chatUnread > 0 && (
                <span
                  aria-label={`${chatUnread} unread chat messages`}
                  className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white"
                >
                  {chatUnread}
                </span>
              )}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ModeSwitch />
            <div className="hidden lg:block">
              <Button
                size="sm"
                icon={isOwner ? Plus : Search}
                onClick={() => navigate(isOwner ? '/teams/new' : '/browse?tab=teams')}
              >
                {isOwner ? 'Create team' : 'Find a team'}
              </Button>
            </div>
            <NotificationBell />
            <Dropdown label="Account menu" trigger={<Avatar name={user.name} size="sm" />} panelClassName="w-60 p-1.5">
              {(close) => (
                <>
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-slate-600">{user.email}</p>
                  </div>
                  <MenuItem
                    icon={User}
                    onClick={() => {
                      close();
                      navigate('/profile');
                    }}
                  >
                    My profile
                  </MenuItem>
                  <MenuItem
                    icon={LogOut}
                    onClick={() => {
                      close();
                      onLogout();
                    }}
                  >
                    Log out
                  </MenuItem>
                </>
              )}
            </Dropdown>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <nav
        aria-label="Mobile"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden"
      >
        {[
          ...NAV.map((n) => ({ ...n, label: n.mobileLabel ?? n.label })),
          { to: '/chat', label: 'Chat', icon: MessageSquare },
          { to: '/profile', label: 'Me', icon: User },
        ].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
                isActive ? 'text-brand-700' : 'text-slate-600',
              )
            }
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden />
              {to === '/chat' && chatUnread > 0 && (
                <span
                  aria-label={`${chatUnread} unread chat messages`}
                  className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white"
                >
                  {chatUnread}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
