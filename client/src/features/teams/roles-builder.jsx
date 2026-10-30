import { useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { RoleFields } from './role-fields.jsx';
import { emptyRole } from './team-form-schema.js';

/** Dynamic list of roles for the create-team form. */
export function RolesBuilder({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'roles' });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <fieldset key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <legend className="px-2 text-sm text-slate-700">Role {index + 1}</legend>
          <RoleFields
            control={control}
            register={register}
            errors={errors.roles?.[index]}
            prefix={`roles.${index}`}
            label={`role ${index + 1}`}
          />
          {fields.length > 1 && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => remove(index)}
                aria-label={`Remove role ${index + 1}`}
              >
                Remove role
              </Button>
            </div>
          )}
        </fieldset>
      ))}
      {errors.roles?.message && (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.roles.message}
        </p>
      )}
      <Button variant="secondary" icon={Plus} onClick={() => append(emptyRole())} disabled={fields.length >= 12}>
        Add another role
      </Button>
    </div>
  );
}
