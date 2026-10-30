import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui';
import { InviteModal } from './request-modals.jsx';

export function InviteButton({ person, roleId, size = 'sm' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} icon={UserPlus} onClick={() => setOpen(true)}>
        Invite
      </Button>
      {open && <InviteModal open onClose={() => setOpen(false)} person={person} defaultRoleId={roleId} />}
    </>
  );
}
