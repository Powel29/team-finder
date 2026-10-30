import { toast } from 'sonner';
import { useRequestAction } from './api.js';

const SUCCESS = { accept: 'Accepted. They are now on the team.', decline: 'Declined', cancel: 'Cancelled' };

/** Wraps the three request mutations with toasts; returns a single `run(action, id)` and the busy id. */
export function useRequestActions() {
  const mutations = {
    accept: useRequestAction('accept'),
    decline: useRequestAction('decline'),
    cancel: useRequestAction('cancel'),
  };
  const busyId = Object.values(mutations).find((m) => m.isPending)?.variables ?? null;
  const run = async (action, id) => {
    try {
      await mutations[action].mutateAsync(id);
      toast.success(SUCCESS[action]);
    } catch (err) {
      toast.error(err.message);
    }
  };
  return { run, busyId };
}
