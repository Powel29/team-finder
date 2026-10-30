import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Button, Card, Skeleton } from '@/components/ui';
import { NotificationItem } from '@/features/notifications/notification-item.jsx';
import { useLatestNotifications, useMarkAllRead, useMarkRead, useUnreadCount } from '@/features/notifications/api.js';
import { useMyTeams } from '@/features/teams/api.js';

const RAIL_ITEMS = 3;

function RailHeading({ title, to, label }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base">{title}</h2>
      <Link to={to} aria-label={label} className="rounded p-1 text-slate-600 hover:bg-slate-100">
        <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function NotificationsCard() {
  const navigate = useNavigate();
  const latest = useLatestNotifications(true);
  const { data: unread } = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = latest.data?.items.slice(0, RAIL_ITEMS) ?? [];

  return (
    <Card as="section" aria-label="Latest notifications" className="space-y-3 p-5">
      <RailHeading title="Notifications" to="/notifications" label="Open notifications" />
      {latest.isPending && <Skeleton className="h-24" />}
      {latest.error && <p className="text-sm text-danger">Could not load notifications.</p>}
      {latest.data && items.length === 0 && <p className="text-sm text-slate-600">You are all caught up.</p>}
      <ul className="divide-y divide-slate-100">
        {items.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            compact
            onOpen={(item) => {
              if (!item.readAt) markRead.mutate(item.id);
              if (item.link) navigate(item.link);
            }}
          />
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <Link to="/notifications">
          <Button size="sm">See all notifications</Button>
        </Link>
        <button
          type="button"
          disabled={!unread?.count}
          onClick={() => markAll.mutate()}
          className="text-sm text-slate-600 hover:text-slate-900 disabled:text-slate-400"
        >
          Mark all read
        </button>
      </div>
    </Card>
  );
}

function TeamsCard() {
  const { data, isPending } = useMyTeams();
  const teams = data ? [...data.owned, ...data.joined] : [];
  return (
    <Card as="section" aria-label="Teams you are on" className="space-y-3 p-5">
      <RailHeading title="Teams you're on" to="/teams" label="Open my teams" />
      {isPending && <Skeleton className="h-10" />}
      {data && teams.length === 0 && (
        <p className="text-sm text-slate-600">You haven&apos;t joined a team yet. Accept an invite or request a role to get started.</p>
      )}
      <ul className="space-y-1">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              to={`/teams/${team.id}`}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
            >
              <span className="truncate font-medium text-slate-900">{team.name}</span>
              <span className="text-xs text-slate-600">{team.openSlots} open</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Right-hand column of the dashboard. */
export function DashboardRail() {
  return (
    <aside className="min-w-0 space-y-4">
      <NotificationsCard />
      <TeamsCard />
    </aside>
  );
}
