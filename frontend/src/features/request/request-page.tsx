import { zodResolver } from '@hookform/resolvers/zod';
import { EMPTY_NEED, createRequestSchema, type CreateRequestInput } from '@archiflow/shared';
import { useMutation } from '@tanstack/react-query';
import { Building2, CheckCircle2, FilePlus2, MapPin, NotebookPen, Plus, Server, ShieldCheck, Trash2, Users, Wifi } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
  useFieldArray,
  useForm,
  type FieldArrayWithId,
  type UseFormRegister,
  type UseFormRegisterReturn,
  type UseFormReturn,
} from 'react-hook-form';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useSession } from '@/auth/session-store';
import { projectsApi } from '@/api/endpoints';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { errorMessage, validationMessage } from '@/utils/errors';

type RequestFormValues = z.input<typeof createRequestSchema>;
type RequestField = keyof RequestFormValues;
const draftKey = (profileId: string) => `archiflow:request-draft:${profileId}`;
const steps = ['general', 'sites', 'needs', 'technical'] as const;

/** Stockage indisponible (navigation privée, quota, environnement de test) : brouillon perdu, jamais un crash. */
function readDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeDraft(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignoré : la sauvegarde en brouillon est un confort, pas une garantie.
  }
}
function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Rien à faire si le stockage n'est déjà pas disponible.
  }
}

/**
 * Un champ jamais touché (valeur par défaut `null`, par ex. après reprise d'un brouillon ou
 * ajout d'une ligne de tableau) transmet `null` directement à `setValueAs`, pas la chaîne vide :
 * `Number(null)` vaut 0, il faut donc écarter `null`/`undefined` en plus de `''`.
 */
function toNullableNumber(value: unknown): number | null {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

export function RequestPage() {
  const { t } = useTranslation();
  const profile = useSession((s) => s.profile);
  const [step, setStep] = useState(0);
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: { ...EMPTY_NEED, name: '', description: '', clientCompanyId: null },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (!profile) return;
    const saved = readDraft(draftKey(profile.id));
    if (!saved) return;
    try {
      form.reset({ ...form.getValues(), ...(JSON.parse(saved) as Partial<RequestFormValues>) });
    } catch {
      clearDraft(draftKey(profile.id));
    }
  }, [form, profile]);

  useEffect(() => {
    if (!profile) return;
    const subscription = form.watch((values) => writeDraft(draftKey(profile.id), JSON.stringify(values)));
    return () => subscription.unsubscribe();
  }, [form, profile]);

  const buildings = useFieldArray({ control: form.control, name: 'buildings' });
  const departments = useFieldArray({ control: form.control, name: 'departments' });

  const mutation = useMutation({ mutationFn: (values: CreateRequestInput) => projectsApi.create(values) });
  const onSubmit = form.handleSubmit(async (values) => {
    if (!profile?.clientCompanyId) return;
    await mutation.mutateAsync({ ...values, clientCompanyId: profile.clientCompanyId } as CreateRequestInput);
    clearDraft(draftKey(profile.id));
  });

  const next = async () => {
    const fields: Array<RequestField[]> = [
      ['name', 'location', 'projectType', 'siteCount'],
      ['buildings', 'departments'],
      ['totalEmployees', 'workstationCount', 'concurrentUsers', 'serverCount', 'freeTextNeed'],
      ['networkNotes', 'securityNotes', 'vendorNotes'],
    ];
    if (await form.trigger(fields[step])) setStep((current) => Math.min(current + 1, steps.length - 1));
  };
  const numberRegister = (name: RequestField) => form.register(name, { setValueAs: toNullableNumber });

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      <header><h1 className="text-xl font-semibold text-fg">{t('request.title')}</h1><p className="mt-1 text-sm text-fg-secondary">{t('request.subtitle')}</p></header>
      {mutation.isSuccess && <Alert tone="success" icon={<CheckCircle2 className="size-4" />}>{t('request.success')}</Alert>}
      {mutation.isError && <Alert tone="critical">{errorMessage(t, mutation.error)}</Alert>}
      <Panel title={t('request.form.title')}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 p-4 md:p-6">
          <div className="flex items-center gap-2" aria-label={t('request.form.progress')}>
            {steps.map((stepName, index) => <div key={stepName} className="flex flex-1 items-center gap-2"><span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${index <= step ? 'bg-primary-solid text-on-solid' : 'bg-inset text-fg-muted'}`}>{index + 1}</span><span className={`hidden text-xs sm:inline ${index === step ? 'font-medium text-fg' : 'text-fg-muted'}`}>{t(`request.steps.${stepName}`)}</span>{index < steps.length - 1 && <span className="h-px flex-1 bg-line" />}</div>)}
          </div>
          {step === 0 && <div className="grid gap-5 md:grid-cols-2">
            <Field label={t('request.fields.name')} error={validationMessage(t, errors.name?.message)}><Input autoFocus {...form.register('name')} /></Field>
            <Field label={t('request.fields.location')} error={validationMessage(t, errors.location?.message)}><Input icon={<MapPin className="size-4" />} {...form.register('location')} /></Field>
            <Field label={t('request.fields.projectType')}><select className="h-9 w-full rounded-field border border-line bg-inset px-3 text-sm text-fg" {...form.register('projectType', { setValueAs: (value) => value === '' ? null : value })}><option value="">{t('request.fields.choose')}</option>{['new_headquarters', 'new_site', 'expansion', 'refresh', 'datacenter', 'multi_site'].map((type) => <option key={type} value={type}>{t(`request.projectTypes.${type}`)}</option>)}</select></Field>
            <Field label={t('request.fields.siteCount')}><Input type="number" min="1" {...numberRegister('siteCount')} /></Field>
            <Field label={t('request.fields.description')} className="md:col-span-2"><textarea rows={4} className="w-full rounded-field border border-line bg-inset px-3 py-2 text-sm text-fg" placeholder={t('request.fields.descriptionPlaceholder')} {...form.register('description')} /></Field>
          </div>}
          {step === 1 && <div className="flex flex-col gap-6">
            <BuildingsSection form={form} fields={buildings.fields} onAdd={() => buildings.append({ name: '', areaM2: null, floors: null, description: null })} onRemove={buildings.remove} t={t} />
            <DepartmentsSection form={form} fields={departments.fields} onAdd={() => departments.append({ name: '', employees: null, workstations: null, location: null, notes: null })} onRemove={departments.remove} t={t} />
          </div>}
          {step === 2 && <div className="flex flex-col gap-5">
            <div className="grid gap-4 md:grid-cols-3"><MetricField label={t('request.fields.employees')} register={numberRegister('totalEmployees')} /><MetricField label={t('request.fields.workstations')} register={numberRegister('workstationCount')} /><MetricField label={t('request.fields.concurrentUsers')} register={numberRegister('concurrentUsers')} /></div>
            <div className="grid gap-4 md:grid-cols-3"><MetricField label={t('request.fields.servers')} register={numberRegister('serverCount')} /><MetricField label={t('request.fields.wifiApCount')} register={numberRegister('wifiApCount')} /><Field label={t('request.fields.storage')}><Input {...form.register('storageNeed')} /></Field></div>
            <Field label={t('request.fields.freeText')} error={validationMessage(t, errors.freeTextNeed?.message)}><textarea rows={5} className="w-full rounded-field border border-line bg-inset px-3 py-2 text-sm text-fg" placeholder={t('request.fields.freeTextPlaceholder')} {...form.register('freeTextNeed')} /></Field>
          </div>}
          {step === 3 && <div className="flex flex-col gap-5">
            <ToggleGroup icon={<Wifi />} title={t('request.fields.networkTitle')} items={['wifi', 'voip', 'cctv', 'internetAccess', 'vpn', 'remoteSites', 'lan', 'wan', 'dmz']} register={form.register} t={t} />
            <ToggleGroup icon={<ShieldCheck />} title={t('request.fields.securityTitle')} items={['firewall', 'idsIps', 'segmentation', 'vlan', 'accessControl', 'haSecurity']} register={form.register} t={t} />
            <div className="grid gap-4 md:grid-cols-2"><Field label={t('request.fields.networkNotes')}><Input {...form.register('networkNotes')} /></Field><Field label={t('request.fields.securityNotes')}><Input {...form.register('securityNotes')} /></Field></div>
            <Field label={t('request.fields.serverNotes')}><Input icon={<Server className="size-4" />} {...form.register('serverNotes')} /></Field>
          </div>}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-5"><Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>{t('common.back')}</Button>{step < steps.length - 1 ? <Button type="button" size="lg" onClick={() => void next()}>{t('common.next')}</Button> : <Button type="submit" size="lg" icon={<FilePlus2 />} loading={isSubmitting || mutation.isPending}>{t('request.form.submit')}</Button>}</div>
        </form>
      </Panel>
      <Panel title={t('request.help.title')} className="bg-inset"><div className="flex items-start gap-3 p-4 text-sm text-fg-secondary md:p-6"><NotebookPen className="mt-0.5 size-4 text-primary" aria-hidden="true" /><p>{t('request.help.text')}</p></div></Panel>
    </div>
  );
}

function MetricField({ label, register }: { label: string; register: UseFormRegisterReturn }) {
  return <Field label={label}><Input type="number" min="0" {...register} /></Field>;
}

function BuildingsSection({
  form,
  fields,
  onAdd,
  onRemove,
  t,
}: {
  form: UseFormReturn<RequestFormValues>;
  fields: FieldArrayWithId<RequestFormValues, 'buildings'>[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  t: TFunction;
}) {
  const numberField = (index: number, name: 'areaM2' | 'floors') =>
    form.register(`buildings.${index}.${name}`, { setValueAs: toNullableNumber });
  const errors = form.formState.errors.buildings;
  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
      <legend className="flex items-center gap-2 px-2 text-sm font-medium text-fg"><Building2 className="size-4" />{t('request.fields.buildingsTitle')}</legend>
      <p className="text-xs text-fg-muted">{t('request.fields.buildingsHint')}</p>
      {fields.length === 0 && <p className="text-sm text-fg-muted">{t('request.fields.noBuildings')}</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="grid items-end gap-3 rounded-field border border-line bg-inset p-3 sm:grid-cols-[1fr_140px_100px_auto]">
          <Field label={t('request.fields.buildingName')} error={validationMessage(t, errors?.[index]?.name?.message)}>
            <Input {...form.register(`buildings.${index}.name`)} />
          </Field>
          <Field label={t('request.fields.areaM2')}><Input type="number" min="0" {...numberField(index, 'areaM2')} /></Field>
          <Field label={t('request.fields.floors')}><Input type="number" min="0" {...numberField(index, 'floors')} /></Field>
          <Button type="button" variant="ghost" size="icon-sm" icon={<Trash2 />} aria-label={t('common.remove')} onClick={() => onRemove(index)} />
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" icon={<Plus />} className="self-start" onClick={onAdd}>{t('request.fields.addBuilding')}</Button>
    </fieldset>
  );
}

function DepartmentsSection({
  form,
  fields,
  onAdd,
  onRemove,
  t,
}: {
  form: UseFormReturn<RequestFormValues>;
  fields: FieldArrayWithId<RequestFormValues, 'departments'>[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  t: TFunction;
}) {
  const numberField = (index: number, name: 'employees' | 'workstations') =>
    form.register(`departments.${index}.${name}`, { setValueAs: toNullableNumber });
  const errors = form.formState.errors.departments;
  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
      <legend className="flex items-center gap-2 px-2 text-sm font-medium text-fg"><Users className="size-4" />{t('request.fields.departmentsTitle')}</legend>
      <p className="text-xs text-fg-muted">{t('request.fields.departmentsHint')}</p>
      {fields.length === 0 && <p className="text-sm text-fg-muted">{t('request.fields.noDepartments')}</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="grid items-end gap-3 rounded-field border border-line bg-inset p-3 sm:grid-cols-[1fr_140px_140px_auto]">
          <Field label={t('request.fields.departmentName')} error={validationMessage(t, errors?.[index]?.name?.message)}>
            <Input {...form.register(`departments.${index}.name`)} />
          </Field>
          <Field label={t('request.fields.employees')}><Input type="number" min="0" {...numberField(index, 'employees')} /></Field>
          <Field label={t('request.fields.workstations')}><Input type="number" min="0" {...numberField(index, 'workstations')} /></Field>
          <Button type="button" variant="ghost" size="icon-sm" icon={<Trash2 />} aria-label={t('common.remove')} onClick={() => onRemove(index)} />
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" icon={<Plus />} className="self-start" onClick={onAdd}>{t('request.fields.addDepartment')}</Button>
    </fieldset>
  );
}

function ToggleGroup({ icon, title, items, register, t }: { icon: ReactNode; title: string; items: string[]; register: UseFormRegister<RequestFormValues>; t: (key: string) => string }) {
  return <fieldset className="rounded-card border border-line p-4"><legend className="flex items-center gap-2 px-2 text-sm font-medium text-fg">{icon}{title}</legend><div className="grid gap-3 sm:grid-cols-3">{items.map((item) => <label key={item} className="flex cursor-pointer items-center gap-2 rounded-field border border-line bg-inset px-3 py-2 text-sm text-fg-secondary transition-colors hover:border-primary"><input type="checkbox" className="accent-primary" {...register(item as RequestField)} />{t(`request.fields.${item}`)}</label>)}</div></fieldset>;
}
