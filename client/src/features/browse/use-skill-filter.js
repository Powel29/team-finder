import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api.js';

/**
 * Bridges URL-stored skill ids and the combobox, which works with {id, name} objects.
 * Names of ids that came from a shared link are fetched once.
 */
export function useSkillFilter(ids, onIdsChange) {
  const [local, setLocal] = useState({});
  const needsLookup = ids.some((id) => !local[id]);

  const { data: fetched = [] } = useQuery({
    queryKey: ['skills', 'byIds', [...ids].sort().join(',')],
    queryFn: () => api(`/api/skills${toQuery({ ids })}`).then((r) => r.items),
    enabled: needsLookup,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

  const byId = { ...Object.fromEntries(fetched.map((s) => [s.id, s])), ...local };

  return {
    selected: ids.map((id) => byId[id]).filter(Boolean),
    onChange: (skills) => {
      setLocal((prev) => ({ ...prev, ...Object.fromEntries(skills.map((s) => [s.id, s])) }));
      onIdsChange(skills.map((s) => s.id));
    },
  };
}
