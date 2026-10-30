import { Link } from 'react-router-dom';
import { Avatar, Badge, Button } from '@/components/ui';
import { timeAgo } from '@/lib/format.js';

const STATUS_TONE = { PENDING: 'warning', ACCEPTED: 'success', DECLINED: 'danger', CANCELLED: 'slate' };

function Sentence({ request }) {
  const { type, direction, sender, recipient, role, team } = request;
  const person = (u) => (
    <Link to={`/people/${u.id}`} className="font-medium text-slate-900 hover:underline">
      {u.name}
    </Link>
  );
  const where = (
    <>
      <strong className="font-medium text-slate-900">{role.title}</strong> in{' '}
      <Link to={`/teams/${team.id}`} className="font-medium text-slate-900 hover:underline">
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
    <li className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={other.name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-700">
            <Sentence request={request} />
          </p>
          {request.message && <p className="mt-0.5 line-clamp-1 text-xs italic text-slate-600">“{request.message}”</p>}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            {!pending && (
              <Badge tone={STATUS_TONE[request.status]}>
                {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
              </Badge>
            )}
            {request.matchScore !== null && <span>{request.matchScore}% match</span>}
            <span>{timeAgo(request.createdAt)}</span>
          </div>
        </div>
      </div>
      {pending && (
        <div className="flex items-center gap-2 sm:justify-end">
          {request.direction === 'RECEIVED' ? (
            <>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('decline', request.id)}>
                Decline
              </Button>
              <Button size="sm" loading={busy} onClick={() => onAction('accept', request.id)}>
                Accept
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
