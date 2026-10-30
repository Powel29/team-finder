import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Send, UserPlus, X } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { JoinRequestModal } from './request-modals.jsx';
import { useRequestActions } from './use-request-actions.js';

/** The action area of a role row on the team page; what it shows depends on the viewer's relation and requests. */
export function RoleActions({ team, role }) {
  const { hasMemberProfile } = useAuth();
  const [joining, setJoining] = useState(false);
  const { run, busyId } = useRequestActions();

  if (team.myRelation === 'OWNER') {
    return role.open > 0 ? (
      <Link to={`/browse?tab=people&roleId=${role.id}`}>
        <Button size="sm" variant="secondary" icon={UserPlus}>
          Invite someone
        </Button>
      </Link>
    ) : null;
  }
  if (team.myRelation === 'MEMBER') return null;

  const pending = team.myPendingRequests.find((r) => r.roleId === role.id);
  if (pending?.direction === 'SENT') {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="success">
          <Check className="size-3.5" aria-hidden /> Requested
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          loading={busyId === pending.requestId}
          onClick={() => run('cancel', pending.requestId)}
        >
          Cancel
        </Button>
      </div>
    );
  }
  if (pending?.direction === 'RECEIVED') {
    return (
      <div className="flex flex-col items-end gap-2">
        <Badge tone="brand">Invited you</Badge>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="success"
            icon={Check}
            loading={busyId === pending.requestId}
            onClick={() => run('accept', pending.requestId)}
          >
            Accept
          </Button>
          <Button size="sm" variant="secondary" icon={X} onClick={() => run('decline', pending.requestId)}>
            Decline
          </Button>
        </div>
      </div>
    );
  }
  if (team.status !== 'OPEN' || role.open === 0) return <Badge>Full</Badge>;
  if (!hasMemberProfile) {
    return (
      <Link to="/onboarding">
        <Button size="sm" variant="secondary">
          Create profile to apply
        </Button>
      </Link>
    );
  }
  return (
    <>
      <Button size="sm" icon={Send} onClick={() => setJoining(true)}>
        Request to join
      </Button>
      <JoinRequestModal open={joining} onClose={() => setJoining(false)} team={team} role={role} />
    </>
  );
}
