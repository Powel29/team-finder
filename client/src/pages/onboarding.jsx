import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, Card, ErrorState, PageSpinner } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { useMyProfile, useSaveProfile } from '@/features/profile/api.js';
import { BasicsSection, GoalsSection, SkillsSection } from '@/features/profile/profile-sections.jsx';
import { emptyProfile, formToPayload, profileSchema, STEP_FIELDS } from '@/features/profile/profile-schema.js';
import { applyServerErrors } from '@/lib/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

const STEPS = ['Basics', 'Skills & level', 'Availability & goals'];

export default function OnboardingPage() {
  usePageTitle('Set up your profile');
  const { user } = useAuth();
  const profile = useMyProfile();
  if (profile.isPending) return <PageSpinner />;
  if (profile.error) return <ErrorState error={profile.error} onRetry={profile.refetch} />;
  if (profile.data) return <Navigate to="/profile" replace />;
  return <Wizard defaultName={user.name} />;
}

function Wizard({ defaultName }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const save = useSaveProfile();
  const {
    register,
    control,
    trigger,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: emptyProfile(defaultName),
  });

  const next = async () => {
    if (await trigger(STEP_FIELDS[step])) setStep((s) => s + 1);
  };

  const onSubmit = async (values) => {
    try {
      await save.mutateAsync(formToPayload(values));
      toast.success('Profile saved. Welcome aboard!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl">Tell us about you</h1>
        <p className="mt-1 text-slate-600">A good profile gets you better matches. You can change everything later.</p>
      </div>
      <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i <= step ? 'bg-ink text-white' : 'bg-slate-200 text-slate-600'}`}
            >
              {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span
              className={`hidden text-sm font-semibold sm:block ${i === step ? 'text-slate-900' : 'text-slate-600'}`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <h2 className="mb-4 text-xl">{STEPS[step]}</h2>
          {step === 0 && <BasicsSection register={register} errors={errors} />}
          {step === 1 && <SkillsSection control={control} errors={errors} />}
          {step === 2 && <GoalsSection control={control} />}
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Next
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button type="submit" loading={save.isPending} icon={Check}>
                Save profile
              </Button>
            )}
          </div>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm">
        <Link to="/dashboard" className="font-medium text-slate-600 hover:underline">
          Skip for now
        </Link>
      </p>
    </div>
  );
}
