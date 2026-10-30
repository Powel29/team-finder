import { Inbox, Send, Users, UsersRound } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import { useDashboardSummary } from '@/features/requests/api.js';

const CARDS = [
  ['pendingReceived', 'Pending received', Inbox],
  ['pendingSent', 'Pending sent', Send],
  ['ownedTeams', 'Teams owned', Users],
  ['joinedTeams', 'Teams joined', UsersRound],
];

export function SummaryCards() {
  const { data, isPending } = useDashboardSummary();
  return (
    <ul aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map(([key, label, Icon]) => (
        <Card as="li" key={key} className="flex items-center gap-3 p-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="size-5" aria-hidden />
          </span>
          <p>
            <span className="block font-display text-2xl font-extrabold leading-none">
              {isPending ? <Skeleton className="h-6 w-8" /> : data[key]}
            </span>
            <span className="mt-1 block text-xs font-medium text-slate-600">{label}</span>
          </p>
        </Card>
      ))}
    </ul>
  );
}
