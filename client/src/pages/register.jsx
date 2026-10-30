import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { AuthFormLayout } from '@/features/auth/auth-form-layout.jsx';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { applyServerErrors } from '@/lib/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Max 80 characters'),
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
});

export default function RegisterPage() {
  usePageTitle('Create account');
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } });

  const onSubmit = async (values) => {
    try {
      await signUp(values);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError)) setError('root', { message: err.message });
    }
  };

  return (
    <AuthFormLayout
      title="Create your account"
      subtitle="It takes a minute. Then tell us about your skills."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-slate-900 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {errors.root.message}
          </p>
        )}
        <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthFormLayout>
  );
}
