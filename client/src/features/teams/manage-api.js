import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.js';
import { useInvalidateTeams } from './api.js';
import { rolePayload, teamFieldsPayload } from './team-form-schema.js';

const post = (path, body) => api(path, { method: 'POST', body });

/** One mutation hook per owner action; every one refreshes team, list and dashboard data. */
export function useTeamActions(teamId) {
  const invalidate = useInvalidateTeams();
  const useAction = (fn) => useMutation({ mutationFn: fn, onSuccess: () => invalidate(teamId) });
  const base = `/api/teams/${teamId}`;
  return {
    updateTeam: useAction((values) => api(base, { method: 'PATCH', body: teamFieldsPayload(values) })),
    setStatus: useAction((status) => api(base, { method: 'PATCH', body: { status } })),
    deleteTeam: useAction(() => api(base, { method: 'DELETE' })),
    addRole: useAction((values) => post(`${base}/roles`, rolePayload(values))),
    updateRole: useAction(({ roleId, values }) =>
      api(`${base}/roles/${roleId}`, { method: 'PATCH', body: rolePayload(values) }),
    ),
    deleteRole: useAction((roleId) => api(`${base}/roles/${roleId}`, { method: 'DELETE' })),
    markFilled: useAction((roleId) => post(`${base}/roles/${roleId}/mark-filled`)),
    reopen: useAction((roleId) => post(`${base}/roles/${roleId}/reopen`)),
    removeMember: useAction((userId) => api(`${base}/members/${userId}`, { method: 'DELETE' })),
    leave: useAction(() => post(`${base}/leave`)),
  };
}
