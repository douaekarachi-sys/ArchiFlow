import { zodResolver } from '@hookform/resolvers/zod';
import type { Role } from '@archiflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { clientCompaniesApi, projectsApi } from '@/api/endpoints';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectKeys } from '@/hooks/use-projects';
import { useCan } from '@/permissions/portals';
import { errorMessage, validationMessage } from '@/utils/errors';
import { ProjectsPanel } from './projects-panel';

/**
 * Liste complète des projets visibles par le rôle — mêmes données que le tableau de bord
 * (ProjectsPanel), en page dédiée. Existe parce que la donnée existe déjà : un lien grisé vers
 * une fonctionnalité déjà réelle serait plus trompeur qu'utile.
 */
export function ProjectsPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const canCreate = useCan('project.create');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">{t('projects.title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('projects.subtitle')}</p>
        </div>
        {canCreate && <CreateProjectDialog />}
      </header>
      <label className="relative block max-w-sm">
        <span className="sr-only">{t('dashboard.search')}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('dashboard.search')}
          className="h-9 w-full rounded-field border border-line bg-inset pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted"
        />
      </label>
      <ProjectsPanel role={role} search={search} />
    </div>
  );
}

const createProjectFormSchema = z.object({
  name: z.string().trim().min(3, 'validation.projectName.required').max(120),
  clientCompanyId: z.string().uuid('validation.clientCompany.required'),
  description: z.string().trim().max(2000).optional(),
});
type CreateProjectForm = z.infer<typeof createProjectFormSchema>;

/** Création minimale (EF-504) : un nom et une société suffisent — le reste se complète ensuite (besoin, conception…). */
function CreateProjectDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const companies = useQuery({ queryKey: ['client-companies'], queryFn: () => clientCompaniesApi.list(), enabled: open });
  const form = useForm<CreateProjectForm>({ resolver: zodResolver(createProjectFormSchema), defaultValues: { name: '', description: '' } });
  const { errors, isSubmitting } = form.formState;
  const create = useMutation({
    mutationFn: (values: CreateProjectForm) => projectsApi.create({ ...values, buildings: [], departments: [], vendors: [] }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      form.reset({ name: '', clientCompanyId: undefined, description: '' });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<FolderPlus />}>{t('projects.new')}</Button>
      </DialogTrigger>
      <DialogContent title={t('projects.new')} description={t('projects.newHint')}>
        <form onSubmit={form.handleSubmit((v) => create.mutateAsync(v))} noValidate className="flex flex-col gap-4">
          {create.isError && <Alert tone="critical">{errorMessage(t, create.error)}</Alert>}
          <Field label={t('projects.form.name')} error={validationMessage(t, errors.name?.message)}>
            <Input {...form.register('name')} placeholder={t('projects.form.namePlaceholder')} />
          </Field>
          <Field label={t('projects.form.company')} error={validationMessage(t, errors.clientCompanyId?.message)}>
            <Select value={form.watch('clientCompanyId')} onValueChange={(v) => form.setValue('clientCompanyId', v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder={companies.isPending ? t('common.loading') : t('projects.form.chooseCompany')} />
              </SelectTrigger>
              <SelectContent>
                {(companies.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('projects.form.description')}>
            <textarea
              {...form.register('description')}
              rows={3}
              className="w-full rounded-field border border-line bg-inset px-3 py-2 text-sm text-fg placeholder:text-fg-muted hover:border-line-strong focus-visible:border-primary"
            />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{t('common.cancel')}</Button>
            </DialogClose>
            <Button type="submit" loading={isSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
