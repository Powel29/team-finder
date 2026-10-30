import clsx from 'clsx';
import { Ban, CheckCircle2, Inbox, Lock, Sparkles, UserCheck, UserMinus, XCircle } from 'lucide-react';
import { timeAgo } from '@/lib/format.js';

const ICONS = {
  REQUEST_RECEIVED: Inbox,
  REQUEST_ACCEPTED: CheckCircle2,
  REQUEST_DECLINED: XCircle,
  REQUEST_CANCELLED: Ban,
  NEW_MATCH: Sparkles,
  ROLE_FILLED: UserCheck,
  TEAM_CLOSED: Lock,
  MEMBER_REMOVED: UserMinus,
};

export function NotificationItem({ notification, onOpen, compact = false }) {
  const Icon = ICONS[notification.type] ?? Inbox;
  const unread = !notification.readAt;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={clsx(
          'flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50',
          unread && 'bg-brand-50/60',
        )}
      >
        <span
          className={clsx(
            'mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
            unread ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={clsx('block text-sm', unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700')}>
            {notification.title}
          </span>
          <span className={clsx('block text-sm text-slate-600', compact && 'line-clamp-2')}>{notification.body}</span>
          <span className="mt-0.5 block text-xs text-slate-600">{timeAgo(notification.createdAt)}</span>
        </span>
        {unread && <span aria-label="Unread" className="mt-2 size-2.5 shrink-0 rounded-full bg-brand-600" />}
      </button>
    </li>
  );
}
