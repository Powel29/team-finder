import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { AuthFormLayout } from '@/features/auth/auth-form-layout.jsx';
import { useAuth } from '@/features/auth/auth-context.jsx';
import { applyServerErrors } from '@/lib/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  usePageTitle('Log in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    try {
      await login(values);
      navigate(location.state?.from ?? '/dashboard', { replace: true });
    } catch (err) {
      if (!applyServerErrors(err, setError)) setError('root', { message: err.message });
    }
  };

  return (
    <AuthFormLayout
      title="Welcome back"
      subtitle="Log in to find teammates and manage your requests."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            {errors.root.message}
          </p>
        )}
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Log in
        </Button>
      </form>
    </AuthFormLayout>
  );
}
