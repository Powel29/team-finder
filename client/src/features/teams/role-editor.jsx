import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import { RoleFields } from './role-fields.jsx';
import { roleSchema } from './team-form-schema.js';

/** Edits or creates one role. `children` renders extra action buttons next to Save. */
export function RoleEditor({ defaults, onSubmit, saveLabel = 'Save role', minSlots = 1, label, children }) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ resolver: zodResolver(roleSchema), defaultValues: defaults });

  const submit = async (values) => {
    const saved = await onSubmit(values);
    if (saved) reset(saved === true ? values : saved);
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <RoleFields control={control} register={register} errors={errors} minSlots={minSlots} label={label} />
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {children}
        <Button type="submit" size="sm" loading={isSubmitting} disabled={!isDirty}>
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
