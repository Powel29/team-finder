import { Input, SkillCombobox } from '@/components/ui';
import { LEVELS, PROJECT_TYPES } from '@/lib/constants.js';
import { CheckboxGroup, MinHoursSlider, SearchInput, SkillModeToggle } from './filter-controls.jsx';
import { useSkillFilter } from './use-skill-filter.js';

export function PeopleFilters({ params, update }) {
  const skills = useSkillFilter(params.skills, (ids) => update({ skills: ids }));
  return (
    <div className="space-y-5">
      <SearchInput
        label="Search people"
        value={params.q}
        onChange={(q) => update({ q })}
        placeholder="Name or headline"
      />
      <div className="space-y-2.5">
        <SkillCombobox
          label="Skills"
          selected={skills.selected}
          onChange={skills.onChange}
          placeholder="Add a skill filter"
        />
        {params.skills.length > 1 && (
          <SkillModeToggle value={params.skillMode} onChange={(skillMode) => update({ skillMode })} />
        )}
      </div>
      <CheckboxGroup
        legend="Experience level"
        options={LEVELS}
        values={params.level}
        onChange={(level) => update({ level })}
      />
      <MinHoursSlider value={params.minHours} onChange={(minHours) => update({ minHours })} />
      <CheckboxGroup
        legend="Looking for"
        options={PROJECT_TYPES}
        values={params.lookingFor}
        onChange={(lookingFor) => update({ lookingFor })}
      />
    </div>
  );
}

export function TeamFilters({ params, update }) {
  const stack = useSkillFilter(params.stack, (ids) => update({ stack: ids }));
  const roleSkill = useSkillFilter(params.roleSkill, (ids) => update({ roleSkill: ids }));
  return (
    <div className="space-y-5">
      <SearchInput label="Search teams" value={params.q} onChange={(q) => update({ q })} placeholder="Name or idea" />
      <SkillCombobox
        label="Tech stack"
        selected={stack.selected}
        onChange={stack.onChange}
        placeholder="Add a technology"
      />
      <SkillCombobox
        label="Open role needs"
        selected={roleSkill.selected}
        onChange={roleSkill.onChange}
        placeholder="Add a skill they need"
        hint="Teams with an open role asking for these."
      />
      <CheckboxGroup
        legend="Project type"
        options={PROJECT_TYPES}
        values={params.type}
        onChange={(type) => update({ type })}
      />
      <Input
        label="Deadline before"
        type="date"
        value={params.deadlineBefore}
        onChange={(e) => update({ deadlineBefore: e.target.value })}
      />
    </div>
  );
}
