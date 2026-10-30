import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { MessageSquare } from 'lucide-react';
import { Avatar, EmptyState, Skeleton } from '@/components/ui';
import { useChatTeams, useChatUnread } from './hooks.js';

export function ChatSidebar({ activeId }) {
  const { teams, isPending } = useChatTeams();
  const unread = useChatUnread();
  if (isPending) return <Skeleton className="h-40" />;
  if (teams.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No team chats yet"
        description="Create a team or join one to chat with its members."
      />
    );
  }
  return (
    <nav aria-label="Team chats" className="rounded-2xl border border-slate-200 bg-white p-2">
      <ul className="space-y-1">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              to={`/teams/${team.id}/chat`}
              aria-current={team.id === activeId ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-lg p-3 transition-colors',
                team.id === activeId ? 'bg-slate-100' : 'hover:bg-slate-50',
              )}
            >
              <Avatar name={team.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{team.name}</span>
                <span className="block text-xs text-slate-600">{team.memberCount} members</span>
              </span>
              {unread[team.id] > 0 && team.id !== activeId && (
                <span
                  aria-label={`${unread[team.id]} unread`}
                  className="min-w-5 rounded-full bg-danger px-1.5 text-center text-xs font-semibold leading-5 text-white"
                >
                  {unread[team.id]}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
