import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Card } from '@/components/ui';
import { useCreateTeam } from '@/features/teams/api.js';
import { RolesBuilder } from '@/features/teams/roles-builder.jsx';
import { TeamFields } from '@/features/teams/team-fields.jsx';
import { createTeamPayload, emptyTeam, teamSchema } from '@/features/teams/team-form-schema.js';
import { useMode } from '@/features/mode/mode-context.jsx';
import { applyServerErrors } from '@/lib/api.js';
import { usePageTitle } from '@/hooks/use-page-title.js';

export default function TeamNewPage() {
  usePageTitle('Create team');
  const navigate = useNavigate();
  const { setMode } = useMode();
  const create = useCreateTeam();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: emptyTeam(),
  });

  const onSubmit = async (values) => {
    try {
      const team = await create.mutateAsync(createTeamPayload(values));
      setMode('owner');
      toast.success('Team created');
      navigate(`/teams/${team.id}`);
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Create a team</h1>
        <p className="mt-1 text-slate-600">Describe your idea, then list the roles you need to fill.</p>
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Team details</h2>
        <TeamFields register={register} control={control} errors={errors} />
      </Card>
      <Card>
        <h2 className="mb-1 text-lg font-bold">Roles</h2>
        <p className="mb-4 text-sm text-slate-600">
          Each role has slots and the skills you need. Members are matched against these.
        </p>
        <RolesBuilder control={control} register={register} errors={errors} />
      </Card>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={create.isPending}>
          Create team
        </Button>
      </div>
    </form>
  );
}
