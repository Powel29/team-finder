import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Dropdown, Skeleton } from '@/components/ui';
import { NotificationItem } from './notification-item.jsx';
import { useLatestNotifications, useMarkAllRead, useMarkRead, useUnreadCount } from './api.js';

/** Bell with an unread badge and a dropdown of the latest notifications. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const latest = useLatestNotifications(open);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const count = unread?.count ?? 0;

  return (
    <Dropdown
      label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      onOpenChange={setOpen}
      panelClassName="w-[min(24rem,calc(100vw-2rem))] p-2"
      trigger={
        <span className="relative inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-200/60 lg:px-3">
          <Bell className="size-4" aria-hidden />
          <span className="hidden lg:inline">Notifications</span>
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-sm">Notifications</h2>
            <button
              type="button"
              disabled={count === 0}
              onClick={() => markAll.mutate()}
              className="text-xs font-medium text-slate-700 hover:underline disabled:text-slate-500 disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          {latest.isPending && <Skeleton className="m-3 h-16" />}
          {latest.error && <p className="px-3 py-4 text-sm text-danger">Could not load notifications.</p>}
          {latest.data?.items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-600">You are all caught up.</p>
          )}
          <ul className="max-h-96 overflow-y-auto" aria-label="Latest notifications">
            {latest.data?.items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                compact
                onOpen={(item) => {
                  if (!item.readAt) markRead.mutate(item.id);
                  close();
                  if (item.link) navigate(item.link);
                }}
              />
            ))}
          </ul>
          <Link
            to="/notifications"
            onClick={close}
            className="mt-1 block rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            View all
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
