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
        <span className="relative inline-flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
          <Bell className="size-5" aria-hidden />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-danger px-1.5 text-center text-[11px] font-bold leading-5 text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-sm font-bold">Notifications</h2>
            <button
              type="button"
              disabled={count === 0}
              onClick={() => markAll.mutate()}
              className="text-xs font-semibold text-brand-700 hover:underline disabled:text-slate-500 disabled:no-underline"
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
            className="mt-1 block rounded-xl px-3 py-2 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50"
          >
            View all
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
