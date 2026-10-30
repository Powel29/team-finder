import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { Card, EmptyState, ErrorState, Skeleton, Tabs } from '@/components/ui';
import { RequestRow } from '@/features/requests/request-row.jsx';
import { useDashboardSummary, useRequests } from '@/features/requests/api.js';
import { useRequestActions } from '@/features/requests/use-request-actions.js';

const EMPTY = {
  received: ['Nothing waiting for you', 'Join requests and invites sent to you show up here.'],
  sent: ['No pending requests', 'Browse teams and request to join a role that fits you.'],
  history: ['No history yet', 'Accepted, declined and cancelled requests will be listed here.'],
};

const PARAMS = {
  received: ['received', 'PENDING'],
  sent: ['sent', 'PENDING'],
  history: ['all', 'ACCEPTED,DECLINED,CANCELLED'],
};

function RequestList({ tab }) {
  const [box, status] = PARAMS[tab];
  const { data, isPending, error, refetch } = useRequests(box, status);
  const { run, busyId } = useRequestActions();

  if (isPending) return <Skeleton className="h-24" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (data.items.length === 0) return <EmptyState icon={Inbox} title={EMPTY[tab][0]} description={EMPTY[tab][1]} />;
  return (
    <ul className="space-y-2" aria-label={`${tab} requests`}>
      {data.items.map((r) => (
        <RequestRow key={r.id} request={r} onAction={run} busyId={busyId} />
      ))}
    </ul>
  );
}

/** Received / Sent / History with live counts. */
export function RequestTabs({ initial = 'received' }) {
  const [tab, setTab] = useState(initial);
  const { data } = useDashboardSummary();
  return (
    <Card as="section" aria-label="Requests" className="space-y-4 p-6">
      <div>
        <h2 className="text-lg">Requests</h2>
        <p className="text-sm text-slate-600">Join requests and invites for the roles you care about</p>
      </div>
      <Tabs
        label="Requests"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'received', label: 'Received', count: data?.pendingReceived },
          { value: 'sent', label: 'Sent', count: data?.pendingSent },
          { value: 'history', label: 'History' },
        ]}
      />
      <RequestList key={tab} tab={tab} />
    </Card>
  );
}
