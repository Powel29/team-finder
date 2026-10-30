import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Skeleton, Tabs } from '@/components/ui';
import { NotificationItem } from '@/features/notifications/notification-item.jsx';
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from '@/features/notifications/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

export default function NotificationsPage() {
  usePageTitle('Notifications');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const list = useNotificationList(filter === 'unread');
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Notifications</h1>
        <Button variant="secondary" size="sm" disabled={!unread?.count} onClick={() => markAll.mutate()}>
          Mark all read
        </Button>
      </div>
      <Tabs
        label="Filter notifications"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread', count: unread?.count },
        ]}
      />
      {list.isPending && <Skeleton className="h-40" />}
      {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}
      {list.data && items.length === 0 && (
        <EmptyState
          icon={BellOff}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="Requests, matches and team updates will appear here as they happen."
        />
      )}
      {items.length > 0 && (
        <Card className="p-2">
          <ul aria-label="Notifications">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={(item) => {
                  if (!item.readAt) markRead.mutate(item.id);
                  if (item.link) navigate(item.link);
                }}
              />
            ))}
          </ul>
        </Card>
      )}
      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
