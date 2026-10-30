import { Controller } from 'react-hook-form';
import { Input, Select, SkillCombobox, Textarea } from '@/components/ui';
import { PROJECT_TYPES } from '@/lib/constants.js';

/** Name, idea, type, size, deadline and tech stack: shared by the create form and the manage page. */
export function TeamFields({ register, control, errors }) {
  return (
    <div className="space-y-4">
      <Input label="Team name" placeholder="e.g. AI Study Buddy" error={errors.name?.message} {...register('name')} />
      <Textarea
        label="Idea"
        rows={5}
        placeholder="What are you building and why?"
        error={errors.idea?.message}
        {...register('idea')}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Project type" error={errors.type?.message} {...register('type')}>
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Input
          label="Target team size"
          type="number"
          min={2}
          max={12}
          hint="Including you"
          error={errors.teamSize?.message}
          {...register('teamSize', { valueAsNumber: true })}
        />
        <Input label="Deadline" type="date" error={errors.deadline?.message} {...register('deadline')} />
      </div>
      <Controller
        control={control}
        name="techStack"
        render={({ field }) => (
          <SkillCombobox
            label="Tech stack"
            selected={field.value}
            onChange={field.onChange}
            allowCreate
            hint="Technologies the team will use."
          />
        )}
      />
    </div>
  );
}
