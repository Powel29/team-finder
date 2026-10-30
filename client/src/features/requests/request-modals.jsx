import { useState } from 'react';
import { toast } from 'sonner';
import { Button, MatchRing, Modal, Select, Textarea } from '@/components/ui';
import { useMyTeams } from '@/features/teams/api.js';
import { useSendRequest } from './api.js';

const MAX = 500;

function MessageField({ value, onChange, placeholder }) {
  return (
    <Textarea
      label="Message (optional)"
      rows={4}
      maxLength={MAX}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      hint={`${value.length}/${MAX}`}
    />
  );
}

/** Member -> team: ask to join one role. */
export function JoinRequestModal({ open, onClose, team, role }) {
  const [message, setMessage] = useState('');
  const send = useSendRequest('join');

  const submit = async () => {
    try {
      await send.mutateAsync({ teamId: team.id, roleId: role.id, message });
      toast.success(`Request sent to ${team.owner.name}`);
      setMessage('');
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Request to join ${role.title}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={send.isPending}>
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          You are applying to <strong>{team.name}</strong>. {team.owner.name} will see your profile and can accept or
          decline.
        </p>
        {role.match && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <MatchRing score={role.match.score} size={48} />
            <p className="text-sm text-slate-700">
              Your match for this role is shown with your request.
              {role.match.missingSkills.length > 0 && (
                <span className="block text-xs text-slate-600">Missing: {role.match.missingSkills.join(', ')}</span>
              )}
            </p>
          </div>
        )}
        <MessageField
          value={message}
          onChange={setMessage}
          placeholder="Say hi and mention what you would bring to the team."
        />
      </div>
    </Modal>
  );
}

/** Owner -> member: invite a person to one of the owner's open roles. */
export function InviteModal({ open, onClose, person, defaultRoleId = '' }) {
  const { data } = useMyTeams();
  const options = (data?.owned ?? [])
    .filter((t) => t.status === 'OPEN')
    .flatMap((t) =>
      t.roles.filter((r) => r.open > 0).map((r) => ({ teamId: t.id, roleId: r.id, label: `${t.name} › ${r.title}` })),
    );
  const [roleId, setRoleId] = useState(defaultRoleId);
  const [message, setMessage] = useState('');
  const send = useSendRequest('invite');
  const selected = options.find((o) => o.roleId === roleId);

  const submit = async () => {
    try {
      await send.mutateAsync({ teamId: selected.teamId, roleId, userId: person.userId, message });
      toast.success(`Invite sent to ${person.name}`);
      setMessage('');
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite ${person.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={send.isPending} disabled={!selected}>
            Send invite
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {options.length === 0 ? (
          <p className="text-sm text-slate-600">You need a team with an open role before you can invite someone.</p>
        ) : (
          <Select label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Select a role…</option>
            {options.map((o) => (
              <option key={o.roleId} value={o.roleId}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
        <MessageField
          value={message}
          onChange={setMessage}
          placeholder="Tell them what you are building and why they would fit."
        />
      </div>
    </Modal>
  );
}
