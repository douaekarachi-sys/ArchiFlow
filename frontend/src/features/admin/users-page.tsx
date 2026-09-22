import { zodResolver } from '@hookform/resolvers/zod';
import { ROLES, isInternalRole, type Role } from '@archiflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Search, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { clientCompaniesApi, usersApi, type ClientCompanyItem, type UserSummary } from '@/api/endpoints';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { errorMessage, validationMessage } from '@/utils/errors';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Mot de passe provisoire fort, sans caractère ambigu (0/O, 1/l) — l'administrateur le communique hors ligne. */
function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join('');
}

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.list({ pageSize: 100, q: search || undefined, includeInactive: true }),
  });
  const companies = useQuery({ queryKey: ['client-companies'], queryFn: () => clientCompaniesApi.list() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const lifecycle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => (active ? usersApi.deactivate(id) : usersApi.reactivate(id)),
    onSuccess: invalidate,
  });
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => usersApi.changeRole(id, role),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">{t('users.title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('users.subtitle')}</p>
        </div>
        <CreateUserDialog companies={companies.data ?? []} onCreated={invalidate} />
      </header>
      <Panel
        title={t('users.listTitle')}
        actions={<span className="text-xs text-fg-muted">{query.data && t('users.count', { count: query.data.total })}</span>}
      >
        <div className="border-b border-line p-4">
          <label className="relative block max-w-sm">
            <span className="sr-only">{t('users.search')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('users.search')} className="pl-9" />
          </label>
        </div>
        {query.isPending ? (
          <div className="p-4">
            <Skeleton className="h-48" />
          </div>
        ) : query.isError ? (
          <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.data.length === 0 ? (
          <EmptyState icon={<Users />} title={t('users.empty')} />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>{t('users.columns.name')}</Th>
                <Th>{t('users.columns.role')}</Th>
                <Th className="hidden md:table-cell">{t('users.columns.company')}</Th>
                <Th className="hidden md:table-cell">{t('users.columns.lastLogin')}</Th>
                <Th>{t('users.columns.state')}</Th>
                <Th />
              </Tr>
            </THead>
            <TBody>
              {query.data.data.map((user) => {
                const active = user.deletedAt === null;
                const company = (companies.data ?? []).find((c) => c.id === user.clientCompanyId);
                return (
                  <Tr key={user.id}>
                    <Td>
                      <div className="font-medium text-fg">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-fg-muted">{user.email}</div>
                    </Td>
                    <Td>
                      <select
                        aria-label={t('users.columns.role')}
                        className="h-8 rounded-field border border-line bg-inset px-2 text-xs text-fg disabled:opacity-60"
                        value={user.role}
                        disabled={changeRole.isPending}
                        onChange={(event) => changeRole.mutate({ id: user.id, role: event.target.value as Role })}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {t(`roles.${role}`)}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td className="hidden text-sm text-fg-secondary md:table-cell">{company?.name ?? '—'}</Td>
                    <Td className="hidden text-sm text-fg-secondary md:table-cell">
                      {user.lastLoginAt ? dateFormat.format(new Date(user.lastLoginAt)) : t('users.never')}
                    </Td>
                    <Td>
                      <Badge tone={active ? 'success' : 'neutral'} icon={active ? <UserCheck /> : <UserX />}>
                        {active ? t('users.state.active') : t('users.state.inactive')}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <EditUserDialog user={user} companies={companies.data ?? []} onSaved={invalidate} />
                        <ResetPasswordDialog userId={user.id} userLabel={`${user.firstName} ${user.lastName}`} />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={active ? <UserX /> : <UserCheck />}
                          loading={lifecycle.isPending && lifecycle.variables?.id === user.id}
                          onClick={() => void lifecycle.mutateAsync({ id: user.id, active })}
                        >
                          {active ? t('users.deactivate') : t('users.reactivate')}
                        </Button>
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

const createUserFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'validation.firstName.required').max(80),
    lastName: z.string().trim().min(1, 'validation.lastName.required').max(80),
    email: z.string().trim().min(1, 'validation.email.required').email('validation.email.invalid'),
    role: z.enum(ROLES),
    clientCompanyId: z.string().optional(),
    temporaryPassword: z.string().min(12, 'validation.password.tooShort'),
  })
  .superRefine((input, ctx) => {
    if (!isInternalRole(input.role) && !input.clientCompanyId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clientCompanyId'], message: 'validation.clientCompany.required' });
    }
  });
type CreateUserForm = z.infer<typeof createUserFormSchema>;

function CreateUserDialog({ companies, onCreated }: { companies: ClientCompanyItem[]; onCreated: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', role: 'ENGINEER', clientCompanyId: '', temporaryPassword: generateTemporaryPassword() },
  });
  const { errors, isSubmitting } = form.formState;
  const role = form.watch('role');
  const create = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      onCreated();
      form.reset({ firstName: '', lastName: '', email: '', role: 'ENGINEER', clientCompanyId: '', temporaryPassword: generateTemporaryPassword() });
      setOpen(false);
    },
  });

  const onSubmit = form.handleSubmit((values) =>
    create.mutateAsync({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      role: values.role,
      temporaryPassword: values.temporaryPassword,
      clientCompanyId: isInternalRole(values.role) ? undefined : values.clientCompanyId,
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<UserPlus />}>{t('users.new')}</Button>
      </DialogTrigger>
      <DialogContent title={t('users.new')} description={t('users.newHint')}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {create.isError && <Alert tone="critical">{errorMessage(t, create.error)}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('users.form.firstName')} error={validationMessage(t, errors.firstName?.message)}>
              <Input {...form.register('firstName')} />
            </Field>
            <Field label={t('users.form.lastName')} error={validationMessage(t, errors.lastName?.message)}>
              <Input {...form.register('lastName')} />
            </Field>
          </div>
          <Field label={t('users.form.email')} error={validationMessage(t, errors.email?.message)}>
            <Input type="email" {...form.register('email')} />
          </Field>
          <Field label={t('users.form.role')}>
            <Select value={role} onValueChange={(v) => form.setValue('role', v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`roles.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!isInternalRole(role) && (
            <Field label={t('users.form.company')} error={validationMessage(t, errors.clientCompanyId?.message)}>
              <Select value={form.watch('clientCompanyId') || undefined} onValueChange={(v) => form.setValue('clientCompanyId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('users.form.chooseCompany')} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label={t('users.form.temporaryPassword')} hint={t('users.form.temporaryPasswordHint')} error={validationMessage(t, errors.temporaryPassword?.message)}>
            <div className="flex gap-2">
              <Input mono {...form.register('temporaryPassword')} />
              <Button type="button" variant="secondary" onClick={() => form.setValue('temporaryPassword', generateTemporaryPassword())}>
                {t('users.form.generate')}
              </Button>
            </div>
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

const editUserFormSchema = z.object({
  firstName: z.string().trim().min(1, 'validation.firstName.required').max(80),
  lastName: z.string().trim().min(1, 'validation.lastName.required').max(80),
  clientCompanyId: z.string().optional(),
});
type EditUserForm = z.infer<typeof editUserFormSchema>;

function EditUserDialog({ user, companies, onSaved }: { user: UserSummary; companies: ClientCompanyItem[]; onSaved: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const internal = isInternalRole(user.role);
  const currentCompanyId = user.clientCompanyId ?? '';
  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName, clientCompanyId: currentCompanyId },
  });
  const { errors, isSubmitting } = form.formState;
  const update = useMutation({
    mutationFn: (values: EditUserForm) =>
      usersApi.update(user.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        ...(internal ? {} : { clientCompanyId: values.clientCompanyId || null }),
      }),
    onSuccess: () => {
      onSaved();
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" icon={<Pencil />} aria-label={t("users.edit")} />
      </DialogTrigger>
      <DialogContent title={t('users.edit')} description={`${user.firstName} ${user.lastName}`}>
        <form onSubmit={form.handleSubmit((v) => update.mutateAsync(v))} noValidate className="flex flex-col gap-4">
          {update.isError && <Alert tone="critical">{errorMessage(t, update.error)}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('users.form.firstName')} error={validationMessage(t, errors.firstName?.message)}>
              <Input {...form.register('firstName')} />
            </Field>
            <Field label={t('users.form.lastName')} error={validationMessage(t, errors.lastName?.message)}>
              <Input {...form.register('lastName')} />
            </Field>
          </div>
          {!internal && (
            <Field label={t('users.form.company')}>
              <Select value={form.watch('clientCompanyId') || undefined} onValueChange={(v) => form.setValue('clientCompanyId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('users.form.chooseCompany')} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
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

function ResetPasswordDialog({ userId, userLabel }: { userId: string; userLabel: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(generateTemporaryPassword);
  const [done, setDone] = useState(false);
  const reset = useMutation({
    mutationFn: () => usersApi.resetPassword(userId, { temporaryPassword: password }),
    onSuccess: () => setDone(true),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPassword(generateTemporaryPassword());
          setDone(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" icon={<KeyRound />} aria-label={t("users.resetPassword")} />
      </DialogTrigger>
      <DialogContent title={t('users.resetPassword')} description={userLabel}>
        <div className="flex flex-col gap-4">
          {reset.isError && <Alert tone="critical">{errorMessage(t, reset.error)}</Alert>}
          {done ? (
            <Alert tone="success">{t('users.resetPasswordDone')}</Alert>
          ) : (
            <Alert tone="warning">{t('users.resetPasswordWarning')}</Alert>
          )}
          <Field label={t('users.form.temporaryPassword')} hint={t('users.form.temporaryPasswordHint')}>
            <div className="flex gap-2">
              <Input mono value={password} readOnly={done} onChange={(e) => setPassword(e.target.value)} />
              {!done && (
                <Button type="button" variant="secondary" onClick={() => setPassword(generateTemporaryPassword())}>
                  {t('users.form.generate')}
                </Button>
              )}
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{done ? t('common.close') : t('common.cancel')}</Button>
            </DialogClose>
            {!done && (
              <Button loading={reset.isPending} disabled={password.length < 12} onClick={() => void reset.mutateAsync()}>
                {t('users.resetPassword')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
