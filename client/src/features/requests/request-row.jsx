import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Avatar, Badge, Button } from '@/components/ui';
import { timeAgo } from '@/lib/format.js';

const STATUS_TONE = { PENDING: 'warning', ACCEPTED: 'success', DECLINED: 'danger', CANCELLED: 'slate' };

function Sentence({ request }) {
  const { type, direction, sender, recipient, role, team } = request;
  const person = (u) => (
    <Link to={`/people/${u.id}`} className="font-semibold hover:text-brand-700">
      {u.name}
    </Link>
  );
  const where = (
    <>
      <strong>{role.title}</strong> in{' '}
      <Link to={`/teams/${team.id}`} className="font-semibold hover:text-brand-700">
        {team.name}
      </Link>
    </>
  );
  if (type === 'JOIN_REQUEST') {
    return direction === 'RECEIVED' ? (
      <>
        {person(sender)} asked to join {where}
      </>
    ) : (
      <>You asked to join {where}</>
    );
  }
  return direction === 'RECEIVED' ? (
    <>
      {person(sender)} invited you to {where}
    </>
  ) : (
    <>
      You invited {person(recipient)} to {where}
    </>
  );
}

/**
 * One request or invite. Buttons depend on direction and status:
 * recipients of a pending item accept or decline, senders cancel, everything else is read-only.
 */
export function RequestRow({ request, onAction, busyId }) {
  const other = request.direction === 'RECEIVED' ? request.sender : request.recipient;
  const pending = request.status === 'PENDING';
  const busy = busyId === request.id;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <Avatar name={other.name} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">
          <Sentence request={request} />
        </p>
        {request.message && <p className="mt-1 line-clamp-2 text-sm italic text-slate-600">“{request.message}”</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <Badge tone={STATUS_TONE[request.status]}>
            {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
          </Badge>
          {request.matchScore !== null && <Badge tone="brand">{request.matchScore}% match</Badge>}
          <span>{timeAgo(request.createdAt)}</span>
        </div>
      </div>
      {pending && (
        <div className="flex gap-2">
          {request.direction === 'RECEIVED' ? (
            <>
              <Button
                size="sm"
                variant="success"
                icon={Check}
                loading={busy}
                onClick={() => onAction('accept', request.id)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={X}
                disabled={busy}
                onClick={() => onAction('decline', request.id)}
              >
                Decline
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" loading={busy} onClick={() => onAction('cancel', request.id)}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
