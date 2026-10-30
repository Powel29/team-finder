import { Controller } from 'react-hook-form';
import clsx from 'clsx';
import { Input, Textarea, SkillCombobox, ChipInput, Slider, Switch } from '@/components/ui';
import { LEVELS, PROJECT_TYPES } from '@/lib/constants.js';

export function BasicsSection({ register, errors }) {
  return (
    <div className="space-y-4">
      <Input label="Full name" error={errors.name?.message} {...register('name')} />
      <Input
        label="Headline"
        placeholder="e.g. Frontend dev who loves design systems"
        hint="One line others see first"
        error={errors.headline?.message}
        {...register('headline')}
      />
      <Textarea
        label="About you"
        placeholder="What are you into? What do you want to build?"
        error={errors.bio?.message}
        {...register('bio')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="GitHub URL"
          placeholder="https://github.com/you"
          error={errors.githubUrl?.message}
          {...register('githubUrl')}
        />
        <Input
          label="Portfolio URL"
          placeholder="https://yoursite.dev"
          error={errors.portfolioUrl?.message}
          {...register('portfolioUrl')}
        />
      </div>
    </div>
  );
}

export function SkillsSection({ control, errors }) {
  return (
    <div className="space-y-6">
      <Controller
        control={control}
        name="skills"
        render={({ field }) => (
          <div>
            <SkillCombobox
              label="Your skills"
              selected={field.value}
              onChange={field.onChange}
              allowCreate
              hint="Pick from the catalogue or add your own."
            />
            {errors.skills && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                {errors.skills.message}
              </p>
            )}
          </div>
        )}
      />
      <Controller
        control={control}
        name="experienceLevel"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Experience level</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {LEVELS.map((level) => (
                <label
                  key={level.value}
                  className={clsx(
                    'cursor-pointer rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600',
                    field.value === level.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="experienceLevel"
                    value={level.value}
                    checked={field.value === level.value}
                    onChange={() => field.onChange(level.value)}
                  />
                  <span className="block text-sm font-bold">{level.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{level.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      />
      <Controller
        control={control}
        name="interests"
        render={({ field }) => (
          <ChipInput
            label="Interests"
            values={field.value}
            onChange={field.onChange}
            placeholder="e.g. AI, climate, games"
          />
        )}
      />
    </div>
  );
}

export function GoalsSection({ control }) {
  return (
    <div className="space-y-6">
      <Controller
        control={control}
        name="availabilityHrs"
        render={({ field }) => (
          <Slider label="Availability" value={field.value} onChange={field.onChange} min={0} max={40} />
        )}
      />
      <Controller
        control={control}
        name="lookingFor"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">I am looking for</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PROJECT_TYPES.map((type) => {
                const checked = field.value.includes(type.value);
                return (
                  <label
                    key={type.value}
                    className={clsx(
                      'cursor-pointer rounded-2xl border p-3 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600',
                      checked
                        ? 'border-brand-600 bg-brand-50 text-brand-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() =>
                        field.onChange(
                          checked ? field.value.filter((v) => v !== type.value) : [...field.value, type.value],
                        )
                      }
                    />
                    {type.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      />
      <Controller
        control={control}
        name="isDiscoverable"
        render={({ field }) => (
          <Switch
            id="discoverable"
            checked={field.value}
            onChange={field.onChange}
            label="Show me in people search"
            description="Team owners can find and invite you."
          />
        )}
      />
    </div>
  );
}
