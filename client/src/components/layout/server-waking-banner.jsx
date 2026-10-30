import { Loader2 } from 'lucide-react';
import { useServerWaking } from '@/lib/api.js';

export function ServerWakingBanner() {
  const waking = useServerWaking();
  if (!waking) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Waking up the server… this can take up to a minute on the first visit.
    </div>
  );
}
