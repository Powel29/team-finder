import { Controller } from 'react-hook-form';
import { Input, Select, SkillCombobox, Stepper } from '@/components/ui';
import { LEVEL_OPTIONS } from './team-form-schema.js';

/** Inputs for one role. `prefix` is the RHF path (e.g. "roles.0"), or empty for a standalone role form. */
export function RoleFields({ control, register, errors = {}, prefix = '', label = 'role', minSlots = 1 }) {
  const path = (field) => (prefix ? `${prefix}.${field}` : field);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Input
          label="Role title"
          placeholder="e.g. Frontend developer"
          error={errors.title?.message}
          {...register(path('title'))}
        />
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Slots</span>
          <Controller
            control={control}
            name={path('slots')}
            render={({ field }) => (
              <Stepper
                label={`slots for ${label}`}
                value={field.value}
                onChange={field.onChange}
                min={minSlots}
                max={10}
              />
            )}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name={path('required')}
          render={({ field }) => (
            <SkillCombobox label="Required skills" selected={field.value} onChange={field.onChange} allowCreate />
          )}
        />
        <Controller
          control={control}
          name={path('nice')}
          render={({ field }) => (
            <SkillCombobox
              label="Nice to have"
              selected={field.value}
              onChange={field.onChange}
              allowCreate
              tone="slate"
            />
          )}
        />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="Minimum level (optional)" {...register(path('minLevel'))}>
          <option value="">Any level</option>
          {LEVEL_OPTIONS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
        <Input
          label="Minimum hours per week (optional)"
          inputMode="numeric"
          placeholder="e.g. 8"
          error={errors.minHoursPerWeek?.message}
          {...register(path('minHoursPerWeek'))}
        />
      </div>
    </>
  );
}
