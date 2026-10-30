import { useState } from 'react';
import { toast } from 'sonner';
import { Lock, LockOpen, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog } from '@/components/ui';
import { RoleEditor } from './role-editor.jsx';
import { emptyRole, teamToForm } from './team-form-schema.js';

function RoleCard({ team, role, formRole, actions }) {
  const [confirming, setConfirming] = useState(false);
  const full = role.open === 0;
  const run = async (promise, message) => {
    try {
      await promise;
      toast.success(message);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  return (
    <Card as="li" className="list-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">{role.title}</h3>
          <Badge tone={full ? 'slate' : 'success'}>{full ? 'Filled' : `${role.open} open`}</Badge>
          <span className="text-sm text-slate-600">
            {role.filled}/{role.slots} filled
          </span>
        </div>
        <div className="flex gap-2">
          {full ? (
            <Button
              size="sm"
              variant="secondary"
              icon={LockOpen}
              loading={actions.reopen.isPending}
              onClick={() => run(actions.reopen.mutateAsync(role.id), 'Role reopened')}
            >
              Reopen
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              icon={Lock}
              loading={actions.markFilled.isPending}
              onClick={() => run(actions.markFilled.mutateAsync(role.id), 'Role marked as filled')}
            >
              Mark filled
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={Trash2}
            disabled={role.filled > 0 || team.roles.length <= 1}
            title={role.filled > 0 ? 'Remove members first' : undefined}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        </div>
      </div>
      <RoleEditor
        key={JSON.stringify(formRole)}
        defaults={formRole}
        minSlots={Math.max(1, role.filled)}
        label={`role ${role.title}`}
        onSubmit={(values) => run(actions.updateRole.mutateAsync({ roleId: role.id, values }), 'Role saved')}
      />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${role.title}?`}
        description="This removes the role and its pending requests. This cannot be undone."
        confirmLabel="Delete role"
        loading={actions.deleteRole.isPending}
        onConfirm={async () => {
          if (await run(actions.deleteRole.mutateAsync(role.id), 'Role deleted')) setConfirming(false);
        }}
      />
    </Card>
  );
}

export function ManageRoles({ team, actions }) {
  const [adding, setAdding] = useState(false);
  const formRoles = teamToForm(team).roles;
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {team.roles.map((role, i) => (
          <RoleCard key={role.id} team={team} role={role} formRole={formRoles[i]} actions={actions} />
        ))}
      </ul>
      {adding ? (
        <Card>
          <h3 className="mb-4 text-lg font-bold">New role</h3>
          <RoleEditor
            defaults={emptyRole()}
            saveLabel="Add role"
            label="new role"
            onSubmit={async (values) => {
              try {
                await actions.addRole.mutateAsync(values);
                toast.success('Role added');
                setAdding(false);
                return false;
              } catch (err) {
                toast.error(err.message);
                return false;
              }
            }}
          >
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </RoleEditor>
        </Card>
      ) : (
        <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)} disabled={team.roles.length >= 12}>
          Add role
        </Button>
      )}
    </div>
  );
}
