import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Building2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { clientCompaniesApi, type ClientCompanyItem } from '@/api/endpoints';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDestructive } from '@/components/ui/confirm-destructive';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { errorMessage, validationMessage } from '@/utils/errors';

const companyFormSchema = z.object({
  name: z.string().trim().min(2, 'validation.name.required').max(120),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().length(2, 'validation.country.length').optional().or(z.literal('')),
});
type CompanyForm = z.infer<typeof companyFormSchema>;

export function ClientCompaniesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['client-companies', 'all'], queryFn: () => clientCompaniesApi.list({ includeArchived: true }) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['client-companies'] });
  const archive = useMutation({ mutationFn: clientCompaniesApi.archive, onSuccess: invalidate });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">{t('clientCompanies.title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('clientCompanies.subtitle')}</p>
        </div>
        <CompanyDialog onSaved={invalidate} />
      </header>
      <Panel title={t('clientCompanies.listTitle')}>
        {query.isPending ? (
          <div className="p-4">
            <Skeleton className="h-48" />
          </div>
        ) : query.isError ? (
          <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState icon={<Building2 />} title={t('clientCompanies.empty')} description={t('clientCompanies.emptyHint')} />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>{t('clientCompanies.columns.name')}</Th>
                <Th className="hidden md:table-cell">{t('clientCompanies.columns.city')}</Th>
                <Th className="hidden md:table-cell">{t('clientCompanies.columns.country')}</Th>
                <Th>{t('clientCompanies.columns.state')}</Th>
                <Th />
              </Tr>
            </THead>
            <TBody>
              {query.data.map((company) => {
                const active = company.deletedAt === null;
                return (
                  <Tr key={company.id}>
                    <Td className="font-medium text-fg">{company.name}</Td>
                    <Td className="hidden text-sm text-fg-secondary md:table-cell">{company.city ?? '—'}</Td>
                    <Td className="hidden text-sm text-fg-secondary md:table-cell">{company.country ?? '—'}</Td>
                    <Td>
                      <Badge tone={active ? 'success' : 'neutral'}>
                        {active ? t('clientCompanies.state.active') : t('clientCompanies.state.archived')}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {active && <CompanyDialog company={company} onSaved={invalidate} />}
                        {active && (
                          <ConfirmDestructive
                            action={t('clientCompanies.archiveAction')}
                            target={company.name}
                            consequence={t('clientCompanies.archiveConsequence')}
                            trigger={<Button variant="ghost" size="icon-sm" icon={<Archive />} aria-label={t('clientCompanies.archiveAction')} />}
                            onConfirm={() => archive.mutateAsync(company.id)}
                          />
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

function CompanyDialog({ company, onSaved }: { company?: ClientCompanyItem; onSaved: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const editing = !!company;
  const form = useForm<CompanyForm>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: { name: company?.name ?? '', city: company?.city ?? '', country: company?.country ?? '' },
  });
  const { errors, isSubmitting } = form.formState;
  const save = useMutation({
    mutationFn: (values: CompanyForm) => {
      const payload = { name: values.name, city: values.city || undefined, country: values.country || undefined };
      return editing ? clientCompaniesApi.update(company.id, payload) : clientCompaniesApi.create(payload);
    },
    onSuccess: () => {
      onSaved();
      if (!editing) form.reset({ name: '', city: '', country: '' });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon-sm" icon={<Pencil />} aria-label={t('clientCompanies.edit')} />
        ) : (
          <Button icon={<Plus />}>{t('clientCompanies.new')}</Button>
        )}
      </DialogTrigger>
      <DialogContent title={editing ? t('clientCompanies.edit') : t('clientCompanies.new')}>
        <form onSubmit={form.handleSubmit((v) => save.mutateAsync(v))} noValidate className="flex flex-col gap-4">
          {save.isError && <Alert tone="critical">{errorMessage(t, save.error)}</Alert>}
          <Field label={t('clientCompanies.form.name')} error={validationMessage(t, errors.name?.message)}>
            <Input {...form.register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('clientCompanies.form.city')}>
              <Input {...form.register('city')} />
            </Field>
            <Field label={t('clientCompanies.form.country')} error={validationMessage(t, errors.country?.message)} hint={t('clientCompanies.form.countryHint')}>
              <Input {...form.register('country')} mono maxLength={2} placeholder="MA" />
            </Field>
          </div>
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
