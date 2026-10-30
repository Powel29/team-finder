import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Card, ErrorState, PageSpinner, ProgressBar } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { useMyProfile, useSaveProfile } from '@/features/profile/api.js';
import { BasicsSection, GoalsSection, SkillsSection } from '@/features/profile/profile-sections.jsx';
import { emptyProfile, formToPayload, profileSchema, profileToForm } from '@/features/profile/profile-schema.js';
import { applyServerErrors } from '@/lib/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

export default function ProfilePage() {
  usePageTitle('My profile');
  const { user } = useAuth();
  const profile = useMyProfile();
  if (profile.isPending) return <PageSpinner />;
  if (profile.error) return <ErrorState error={profile.error} onRetry={profile.refetch} />;
  const defaults = profile.data ? profileToForm(profile.data, user.name) : emptyProfile(user.name);
  // Re-mount when saved data changes so the form resets to the server state.
  return (
    <ProfileForm
      key={profile.dataUpdatedAt}
      defaults={defaults}
      completeness={profile.data?.completeness ?? 0}
      isNew={!profile.data}
    />
  );
}

function ProfileForm({ defaults, completeness, isNew }) {
  const save = useSaveProfile();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });

  const onSubmit = async (values) => {
    try {
      await save.mutateAsync(formToPayload(values));
      toast.success('Profile saved');
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">{isNew ? 'Create your profile' : 'My profile'}</h1>
        <p className="mt-1 text-slate-600">The more complete your profile, the better your matches.</p>
        <ProgressBar className="mt-4" value={completeness} label="Profile completeness" />
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Basics</h2>
        <BasicsSection register={register} errors={errors} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Skills & level</h2>
        <SkillsSection control={control} errors={errors} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Availability & goals</h2>
        <GoalsSection control={control} />
      </Card>
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!isDirty && !isNew}>
          Save changes
        </Button>
      </div>
      <p className="text-center text-sm text-slate-600">
        Want to see how others view you?{' '}
        <Link to="/browse?tab=people" className="font-semibold text-brand-700 hover:underline">
          Browse people
        </Link>
      </p>
    </form>
  );
}
