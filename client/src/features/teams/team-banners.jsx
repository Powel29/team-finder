import { Lock } from 'lucide-react';

export function ClosedBanner({ team, isOwner }) {
  if (team.status === 'CLOSED') {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          <strong>All roles filled — listing closed.</strong>{' '}
          {isOwner ? 'Reopen a role to list it again.' : 'This team is no longer recruiting.'}
        </p>
      </div>
    );
  }
  if (team.status === 'ARCHIVED') {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-700"
      >
        <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          <strong>This team is archived</strong> and hidden from browse.{' '}
          {isOwner ? 'Unarchive it from the Danger zone to list it again.' : ''}
        </p>
      </div>
    );
  }
  return null;
}
