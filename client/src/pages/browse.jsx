import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, SlidersHorizontal, Users, UserSearch } from 'lucide-react';
import { Button, CardSkeletons, Drawer, EmptyState, ErrorState, Pagination, Select, Tabs } from '@/components/ui';
import { useMode } from '@/features/mode/mode-context.jsx';
import { useMembers, useTeams } from '@/features/browse/api.js';
import { activeFilterCount, useBrowseParams } from '@/features/browse/use-browse-params.js';
import { PeopleFilters, TeamFilters } from '@/features/browse/people-filters.jsx';
import { RoleContextSelect } from '@/features/browse/role-context-select.jsx';
import { PersonCard } from '@/features/people/person-card.jsx';
import { InviteButton } from '@/features/requests/invite-button.jsx';
import { TeamCard } from '@/features/teams/team-card.jsx';
import { usePageTitle } from '@/hooks/use-page-title.js';

function Results({ query, renderItem, empty, onClear, cols = 'sm:grid-cols-2 xl:grid-cols-3' }) {
  const { data, isPending, isFetching, error, refetch } = query;
  if (isPending) return <CardSkeletons count={6} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (data.items.length === 0)
    return (
      <EmptyState
        {...empty}
        action={
          onClear ? (
            <Button variant="secondary" onClick={onClear}>
              Clear filters
            </Button>
          ) : (
            empty.action
          )
        }
      />
    );
  return (
    <div className={isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'} aria-busy={isFetching}>
      <div className={`grid gap-4 ${cols}`}>{data.items.map(renderItem)}</div>
    </div>
  );
}

function PeopleResults({ params, update, clear, isFiltered, isOwner }) {
  const query = useMembers(params);
  return (
    <>
      <Results
        query={query}
        onClear={isFiltered ? clear : undefined}
        empty={{
          icon: UserSearch,
          title: 'No people match these filters',
          description: 'Try removing a filter or searching for something broader.',
        }}
        renderItem={(p) => (
          <PersonCard
            key={p.userId}
            person={p}
            roleId={params.roleId}
            actions={isOwner && <InviteButton person={p} roleId={params.roleId} />}
          />
        )}
      />
      {query.data && (
        <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={(page) => update({ page })} />
      )}
    </>
  );
}

function TeamResults({ params, update, clear, isFiltered }) {
  const query = useTeams(params);
  return (
    <>
      <Results
        query={query}
        onClear={isFiltered ? clear : undefined}
        empty={{
          icon: Users,
          title: 'No open teams match these filters',
          description: 'Try removing a filter, or create your own team.',
          action: (
            <Link to="/teams/new">
              <Button icon={Plus}>Create team</Button>
            </Link>
          ),
        }}
        renderItem={(t) => <TeamCard key={t.id} team={t} bestMatch={t.bestMatch} />}
      />
      {query.data && (
        <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={(page) => update({ page })} />
      )}
    </>
  );
}

export default function BrowsePage() {
  usePageTitle('Browse');
  const { isOwner } = useMode();
  const { params, update, clear, setTab } = useBrowseParams();
  const [drawer, setDrawer] = useState(false);
  const tab = params.tab ?? (isOwner ? 'people' : 'teams');
  const filterCount = activeFilterCount(params, tab);
  const isFiltered = filterCount > 0 || Boolean(params.roleId);
  const Filters = tab === 'people' ? PeopleFilters : TeamFilters;

  const panel = (
    <div className="space-y-5">
      {tab === 'people' && (
        <RoleContextSelect
          value={params.roleId}
          onChange={(roleId) => update({ roleId, sort: roleId ? 'match' : '' })}
        />
      )}
      <Filters params={params} update={update} />
      {tab === 'teams' && (
        <Select
          label="Sort by"
          value={params.sort || 'recent'}
          onChange={(e) => update({ sort: e.target.value === 'recent' ? '' : e.target.value })}
        >
          <option value="recent">Newest</option>
          <option value="match">Best match for me</option>
          <option value="deadline">Soonest deadline</option>
        </Select>
      )}
      {tab === 'people' && params.roleId && (
        <Select label="Sort by" value={params.sort || 'match'} onChange={(e) => update({ sort: e.target.value })}>
          <option value="match">Best match for role</option>
          <option value="recent">Newest</option>
        </Select>
      )}
      {isFiltered && (
        <Button variant="ghost" className="w-full" onClick={clear}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Browse</h1>
        {isOwner && (
          <Link to="/teams/new">
            <Button icon={Plus} size="sm">
              Create team
            </Button>
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Browse"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'people', label: 'People' },
            { value: 'teams', label: 'Teams' },
          ]}
        />
        <Button
          variant="secondary"
          size="sm"
          icon={SlidersHorizontal}
          className="lg:hidden"
          onClick={() => setDrawer(true)}
        >
          Filters{filterCount > 0 ? ` (${filterCount})` : ''}
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside
          aria-label="Filters"
          className="hidden h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:block"
        >
          {panel}
        </aside>
        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="sr-only">
            {tab === 'people' ? 'People results' : 'Team results'}
          </h2>
          {tab === 'people' ? (
            <PeopleResults params={params} update={update} clear={clear} isFiltered={isFiltered} isOwner={isOwner} />
          ) : (
            <TeamResults params={params} update={update} clear={clear} isFiltered={isFiltered} />
          )}
        </section>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters">
        {panel}
        <Button className="mt-6 w-full" onClick={() => setDrawer(false)}>
          Show results
        </Button>
      </Drawer>
    </div>
  );
}
