import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const toList = (value) => (value ? value.split(',').filter(Boolean) : []);

/** All browse filters live in the URL so searches are shareable and survive refresh. */
export function useBrowseParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const update = useCallback(
    (patch) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            const empty =
              value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
            if (empty) next.delete(key);
            else next.set(key, Array.isArray(value) ? value.join(',') : String(value));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const clear = useCallback(
    () => setSearchParams((prev) => (prev.get('tab') ? { tab: prev.get('tab') } : {}), { replace: true }),
    [setSearchParams],
  );

  const setTab = useCallback((tab) => setSearchParams({ tab }, { replace: true }), [setSearchParams]);

  const params = useMemo(
    () => ({
      tab: searchParams.get('tab'),
      q: searchParams.get('q') ?? '',
      skills: toList(searchParams.get('skills')),
      skillMode: searchParams.get('skillMode') ?? 'any',
      level: toList(searchParams.get('level')),
      minHours: searchParams.get('minHours') ?? '',
      lookingFor: toList(searchParams.get('lookingFor')),
      roleId: searchParams.get('roleId') ?? '',
      sort: searchParams.get('sort') ?? '',
      stack: toList(searchParams.get('stack')),
      roleSkill: toList(searchParams.get('roleSkill')),
      type: toList(searchParams.get('type')),
      deadlineBefore: searchParams.get('deadlineBefore') ?? '',
      page: Number(searchParams.get('page')) || 1,
    }),
    [searchParams],
  );

  return { params, update, clear, setTab };
}

/** Counts the filters that narrow results, for the mobile "Filters" badge. */
export function activeFilterCount(params, tab) {
  const keys =
    tab === 'people'
      ? ['q', 'skills', 'level', 'minHours', 'lookingFor']
      : ['q', 'stack', 'roleSkill', 'type', 'deadlineBefore'];
  return keys.filter((k) => (Array.isArray(params[k]) ? params[k].length > 0 : Boolean(params[k]))).length;
}
