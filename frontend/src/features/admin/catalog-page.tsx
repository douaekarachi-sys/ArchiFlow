import { zodResolver } from '@hookform/resolvers/zod';
import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from '@archiflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Cpu, Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { catalogApi } from '@/api/endpoints';
import { CategoryBadge } from '@/components/patterns/category-badge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDestructive } from '@/components/ui/confirm-destructive';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useCan } from '@/permissions/portals';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { errorMessage, validationMessage } from '@/utils/errors';

export function CatalogPage() {
  const { t } = useTranslation();
  const canManage = useCan('catalog.manage');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | EquipmentCategory>('all');
  const query = useQuery({
    queryKey: ['catalog', search, category],
    queryFn: () => catalogApi.equipment({ pageSize: 100, q: search || undefined, category: category === 'all' ? undefined : category }),
  });

  return (
    <div className="dashboard-shell -mx-4 -my-6 min-h-[calc(100dvh-3.5rem)] px-4 pb-8 md:-mx-8 md:-my-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[hsl(var(--dashboard-line))] py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--dashboard-purple))]">{t('catalog.eyebrow')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-[hsl(var(--dashboard-text))]">{t('catalog.title')}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--dashboard-muted))]">{t('catalog.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="dashboard-search flex w-full max-w-xs items-center gap-2 rounded-field px-3 py-2">
            <Search className="size-4 text-[hsl(var(--dashboard-muted))]" />
            <span className="sr-only">{t('catalog.search')}</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('catalog.search')} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          {canManage && <CreateModelDialog />}
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto py-4" aria-label={t('catalog.filters')}>
        {(['all', ...EQUIPMENT_CATEGORIES] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-button border px-3 py-1.5 text-xs transition-colors ${category === item ? 'border-[hsl(var(--dashboard-purple))] bg-[hsl(var(--dashboard-purple))] text-white' : 'border-[hsl(var(--dashboard-line))] text-[hsl(var(--dashboard-muted))] hover:border-[hsl(var(--dashboard-purple))]'}`}
          >
            {item === 'all' ? t('catalog.all') : t(`equipment.category.${item}`)}
          </button>
        ))}
      </nav>

      {query.isPending ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40 rounded-card" />)}
        </div>
      ) : query.isError ? (
        <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState icon={<Cpu />} title={t('catalog.empty')} description={t('catalog.emptyHint')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.data.data.map((equipment) => <EquipmentCard key={equipment.id} equipment={equipment} canManage={canManage} />)}
        </div>
      )}
    </div>
  );
}

function EquipmentCard({
  equipment,
  canManage,
}: {
  equipment: Awaited<ReturnType<typeof catalogApi.equipment>>['data'][number];
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const archive = useMutation({
    mutationFn: () => catalogApi.archiveModel(equipment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  });

  return (
    <article className="dashboard-summary-card rounded-card border border-[hsl(var(--dashboard-line))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-[hsl(var(--dashboard-blue)/.14)] text-[hsl(var(--dashboard-blue))]"><Cpu className="size-5" /></span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-[hsl(var(--dashboard-text))]">{equipment.name}</h2>
            <p className="truncate text-xs text-[hsl(var(--dashboard-muted))]">{equipment.brand.manufacturer.name} · {equipment.brand.name}</p>
          </div>
        </div>
        <CategoryBadge category={equipment.category.code as EquipmentCategory} />
      </div>
      <p className="mt-4 font-mono text-xs text-[hsl(var(--dashboard-muted))]">{equipment.reference}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[hsl(var(--dashboard-line))] pt-3 text-xs text-[hsl(var(--dashboard-muted))]">
        <span>{t('catalog.ports')}: <strong className="text-[hsl(var(--dashboard-text))]">{equipment.portCount ?? '-'}</strong></span>
        <span>{t('catalog.throughput')}: <strong className="text-[hsl(var(--dashboard-text))]">{equipment.throughputMbps ? `${equipment.throughputMbps} Mbps` : '-'}</strong></span>
        <span>{t('catalog.power')}: <strong className="text-[hsl(var(--dashboard-text))]">{equipment.powerDrawW ? `${equipment.powerDrawW} W` : '-'}</strong></span>
        <span>{equipment.isDemoData ? t('catalog.demo') : (equipment.availability ?? '-')}</span>
      </div>
      {(equipment.archivedAt || canManage) && (
        <div className="mt-3 flex items-center justify-between border-t border-[hsl(var(--dashboard-line))] pt-3">
          {equipment.archivedAt ? (
            <Badge tone="neutral">{t('catalog.archived')}</Badge>
          ) : (
            <div className="flex gap-2">
              <EditModelDialog equipment={equipment} />
              <ConfirmDestructive
                action={t('catalog.archiveAction')}
                target={equipment.name}
                consequence={t('catalog.archiveConsequence')}
                trigger={<Button variant="ghost" size="sm" icon={<Archive />}>{t('catalog.archiveAction')}</Button>}
                onConfirm={() => archive.mutateAsync()}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

const createModelFormSchema = z.object({
  manufacturerName: z.string().trim().min(1, 'validation.name.required').max(120),
  brandName: z.string().trim().min(1, 'validation.name.required').max(120),
  categoryCode: z.enum(EQUIPMENT_CATEGORIES),
  name: z.string().trim().min(1, 'validation.name.required').max(160),
  reference: z.string().trim().min(1, 'validation.reference.required').max(120),
  portCount: z.string().optional(),
  throughputMbps: z.string().optional(),
  powerDrawW: z.string().optional(),
  rackUnits: z.string().optional(),
  indicativePrice: z.string().optional(),
  currency: z.string().max(3).optional(),
  licenseAnnualCost: z.string().optional(),
});
type CreateModelForm = z.infer<typeof createModelFormSchema>;

/**
 * Un seul formulaire pour fabricant + marque + modèle : la création de fabricant/marque est
 * idempotente côté serveur (catalog.service.ts) — retaper un nom déjà présent le réutilise,
 * sans exposer une gestion séparée des fabricants pour ce premier jet (EF-505).
 */
function CreateModelDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<CreateModelForm>({
    resolver: zodResolver(createModelFormSchema),
    defaultValues: { manufacturerName: '', brandName: '', categoryCode: 'switch', name: '', reference: '', currency: 'MAD' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const manufacturer = await catalogApi.createManufacturer({ name: values.manufacturerName });
    const brand = await catalogApi.createBrand({ manufacturerId: manufacturer.id, name: values.brandName });
    await catalogApi.createModel({
      brandId: brand.id,
      categoryCode: values.categoryCode,
      name: values.name,
      reference: values.reference,
      portCount: values.portCount ? Number(values.portCount) : undefined,
      throughputMbps: values.throughputMbps ? Number(values.throughputMbps) : undefined,
      powerDrawW: values.powerDrawW ? Number(values.powerDrawW) : undefined,
      rackUnits: values.rackUnits ? Number(values.rackUnits) : undefined,
      indicativePrice: values.indicativePrice ? Number(values.indicativePrice) : undefined,
      currency: values.currency || undefined,
      licenseAnnualCost: values.licenseAnnualCost ? Number(values.licenseAnnualCost) : undefined,
    });
    await queryClient.invalidateQueries({ queryKey: ['catalog'] });
    form.reset();
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<Plus />}>{t('catalog.newModel')}</Button>
      </DialogTrigger>
      <DialogContent title={t('catalog.newModel')} description={t('catalog.newModelHint')}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('catalog.manufacturer')} error={validationMessage(t, errors.manufacturerName?.message)}>
              <Input {...form.register('manufacturerName')} placeholder="Cisco" />
            </Field>
            <Field label={t('catalog.brand')} error={validationMessage(t, errors.brandName?.message)}>
              <Input {...form.register('brandName')} placeholder="Cisco" />
            </Field>
          </div>
          <Field label={t('catalog.category')}>
            <Select value={form.watch('categoryCode')} onValueChange={(v) => form.setValue('categoryCode', v as EquipmentCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EQUIPMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`equipment.category.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('catalog.modelName')} error={validationMessage(t, errors.name?.message)}>
              <Input {...form.register('name')} placeholder="Catalyst 9300-48P" />
            </Field>
            <Field label={t('catalog.reference')} error={validationMessage(t, errors.reference?.message)}>
              <Input {...form.register('reference')} mono placeholder="C9300-48P-E" />
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label={t('catalog.ports')}><Input {...form.register('portCount')} inputMode="numeric" /></Field>
            <Field label={t('catalog.throughput')}><Input {...form.register('throughputMbps')} inputMode="numeric" /></Field>
            <Field label={t('catalog.power')}><Input {...form.register('powerDrawW')} inputMode="numeric" /></Field>
            <Field label={t('catalog.rackUnits')}><Input {...form.register('rackUnits')} inputMode="numeric" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('catalog.price')}><Input {...form.register('indicativePrice')} inputMode="decimal" /></Field>
            <Field label={t('catalog.currency')}><Input {...form.register('currency')} mono /></Field>
            <Field label={t('catalog.licenseAnnualCost')}><Input {...form.register('licenseAnnualCost')} inputMode="decimal" /></Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{t('common.save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editModelFormSchema = z.object({
  name: z.string().trim().min(1, 'validation.name.required').max(160),
  reference: z.string().trim().min(1, 'validation.reference.required').max(120),
  portCount: z.string().optional(),
  throughputMbps: z.string().optional(),
  powerDrawW: z.string().optional(),
  rackUnits: z.string().optional(),
  indicativePrice: z.string().optional(),
  currency: z.string().max(3).optional(),
  licenseAnnualCost: z.string().optional(),
});
type EditModelForm = z.infer<typeof editModelFormSchema>;

/** Modification (EF-505) : tout sauf le fabricant/la marque/la catégorie — un changement de famille est une nouvelle fiche. */
function EditModelDialog({ equipment }: { equipment: Awaited<ReturnType<typeof catalogApi.equipment>>['data'][number] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<EditModelForm>({
    resolver: zodResolver(editModelFormSchema),
    defaultValues: {
      name: equipment.name,
      reference: equipment.reference,
      portCount: equipment.portCount?.toString() ?? '',
      throughputMbps: equipment.throughputMbps?.toString() ?? '',
      powerDrawW: equipment.powerDrawW?.toString() ?? '',
      rackUnits: equipment.rackUnits?.toString() ?? '',
      indicativePrice: equipment.indicativePrice?.toString() ?? '',
      currency: equipment.currency ?? 'MAD',
      licenseAnnualCost: equipment.licenseAnnualCost?.toString() ?? '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const update = useMutation({
    mutationFn: (values: EditModelForm) =>
      catalogApi.updateModel(equipment.id, {
        name: values.name,
        reference: values.reference,
        portCount: values.portCount ? Number(values.portCount) : undefined,
        throughputMbps: values.throughputMbps ? Number(values.throughputMbps) : undefined,
        powerDrawW: values.powerDrawW ? Number(values.powerDrawW) : undefined,
        rackUnits: values.rackUnits ? Number(values.rackUnits) : undefined,
        indicativePrice: values.indicativePrice ? Number(values.indicativePrice) : undefined,
        currency: values.currency || undefined,
        licenseAnnualCost: values.licenseAnnualCost ? Number(values.licenseAnnualCost) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" icon={<Pencil />}>{t('catalog.editAction')}</Button>
      </DialogTrigger>
      <DialogContent title={t('catalog.editModel')} description={`${equipment.brand.manufacturer.name} · ${equipment.brand.name}`}>
        <form onSubmit={form.handleSubmit((v) => update.mutateAsync(v))} noValidate className="flex flex-col gap-4">
          {update.isError && <Alert tone="critical">{errorMessage(t, update.error)}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('catalog.modelName')} error={validationMessage(t, errors.name?.message)}>
              <Input {...form.register('name')} />
            </Field>
            <Field label={t('catalog.reference')} error={validationMessage(t, errors.reference?.message)}>
              <Input {...form.register('reference')} mono />
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label={t('catalog.ports')}><Input {...form.register('portCount')} inputMode="numeric" /></Field>
            <Field label={t('catalog.throughput')}><Input {...form.register('throughputMbps')} inputMode="numeric" /></Field>
            <Field label={t('catalog.power')}><Input {...form.register('powerDrawW')} inputMode="numeric" /></Field>
            <Field label={t('catalog.rackUnits')}><Input {...form.register('rackUnits')} inputMode="numeric" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('catalog.price')}><Input {...form.register('indicativePrice')} inputMode="decimal" /></Field>
            <Field label={t('catalog.currency')}><Input {...form.register('currency')} mono /></Field>
            <Field label={t('catalog.licenseAnnualCost')}><Input {...form.register('licenseAnnualCost')} inputMode="decimal" /></Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}>{t('common.save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
