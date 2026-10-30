import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';

export const formatDate = (iso) => format(new Date(iso), 'd MMM yyyy');

export const timeAgo = (iso) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

export function dayLabel(iso) {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE d MMM');
}

export const timeOfDay = (iso) => format(new Date(iso), 'HH:mm');

/** Human countdown for a deadline: tone is used to colour the badge. */
export function deadlineInfo(iso, now = new Date()) {
  if (!iso) return null;
  const days = differenceInCalendarDays(new Date(iso), now);
  if (days < 0) return { label: 'Deadline passed', tone: 'slate' };
  if (days === 0) return { label: 'Due today', tone: 'danger' };
  if (days === 1) return { label: '1 day left', tone: 'danger' };
  return { label: `${days} days left`, tone: days <= 7 ? 'warning' : 'slate' };
}

export const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
