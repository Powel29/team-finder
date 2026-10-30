import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Trash2, UserMinus } from 'lucide-react';
import { Avatar, Button, Card, ConfirmDialog, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { RequestRow } from '@/features/requests/request-row.jsx';
import { useRequests } from '@/features/requests/api.js';
import { useRequestActions } from '@/features/requests/use-request-actions.js';
import { applyServerErrors } from '@/lib/api.js';
import { TeamFields } from './team-fields.jsx';
import { teamSchema, teamToForm } from './team-form-schema.js';

const overviewSchema = teamSchema.omit({ roles: true });

export function ManageOverview({ team, actions }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(overviewSchema),
    defaultValues: teamToForm(team),
  });

  const onSubmit = async (values) => {
    try {
      await actions.updateTeam.mutateAsync(values);
      reset(values);
      toast.success('Team updated');
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err.message);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <TeamFields register={register} control={control} errors={errors} />
        <div className="flex justify-end">
          <Button type="submit" loading={actions.updateTeam.isPending} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ManageMembers({ team, actions }) {
  const [target, setTarget] = useState(null);
  const members = team.members.filter((m) => !m.isOwner);
  if (members.length === 0) {
    return (
      <EmptyState
        title="No members yet"
        description="People who accept your invites or whose requests you accept will appear here."
      />
    );
  }
  return (
    <Card className="p-2">
      <ul className="divide-y divide-slate-100">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 p-3">
            <Avatar name={m.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.name}</p>
              <p className="text-sm text-slate-600">{m.roleTitle ?? 'Member'}</p>
            </div>
            <Button size="sm" variant="secondary" icon={UserMinus} onClick={() => setTarget(m)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={`Remove ${target?.name}?`}
        description="They lose access to the team chat and their slot is freed. They are notified."
        confirmLabel="Remove member"
        loading={actions.removeMember.isPending}
        onConfirm={async () => {
          try {
            await actions.removeMember.mutateAsync(target.userId);
            toast.success('Member removed');
            setTarget(null);
          } catch (err) {
            toast.error(err.message);
          }
        }}
      />
    </Card>
  );
}

export function ManageRequests({ team }) {
  const { data, isPending, error, refetch } = useRequests('all', 'PENDING', team.id);
  const { run, busyId } = useRequestActions();
  if (isPending) return <Skeleton className="h-24" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (data.items.length === 0)
    return (
      <EmptyState title="No pending requests" description="Join requests and invites for this team show up here." />
    );
  return (
    <ul className="space-y-3" aria-label="Pending requests">
      {data.items.map((r) => (
        <RequestRow key={r.id} request={r} onAction={run} busyId={busyId} />
      ))}
    </ul>
  );
}

export function DangerZone({ team, actions }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const archived = team.status === 'ARCHIVED';

  const toggleArchive = async () => {
    try {
      await actions.setStatus.mutateAsync(archived ? 'OPEN' : 'ARCHIVED');
      toast.success(archived ? 'Team unarchived' : 'Team archived');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="space-y-5 border-red-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">{archived ? 'Unarchive team' : 'Archive team'}</h3>
          <p className="text-sm text-slate-600">
            {archived ? 'List the team in browse again.' : 'Hide the team from browse without deleting anything.'}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={archived ? ArchiveRestore : Archive}
          loading={actions.setStatus.isPending}
          onClick={toggleArchive}
        >
          {archived ? 'Unarchive' : 'Archive'}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <div>
          <h3 className="font-bold text-danger">Delete team</h3>
          <p className="text-sm text-slate-600">Permanently removes the team, its roles, requests and chat history.</p>
        </div>
        <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
          Delete team
        </Button>
      </div>
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete ${team.name}?`}
        description="This cannot be undone. Members are notified and the chat history is deleted."
        confirmLabel="Delete team"
        loading={actions.deleteTeam.isPending}
        onConfirm={async () => {
          try {
            await actions.deleteTeam.mutateAsync();
            toast.success('Team deleted');
            navigate('/teams', { replace: true });
          } catch (err) {
            toast.error(err.message);
          }
        }}
      />
    </Card>
  );
}
