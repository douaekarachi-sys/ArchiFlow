import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, UserX, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/api/endpoints';
import { ProjectStatusBadge } from '@/components/patterns/project-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { errorMessage } from '@/utils/errors';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.list({ pageSize: 100, q: search || undefined }),
  });
  const lifecycle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? usersApi.deactivate(id) : usersApi.reactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-fg">{t('users.title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('users.subtitle')}</p>
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
          <div className="p-4"><Skeleton className="h-48" /></div>
        ) : query.isError ? (
          <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.data.length === 0 ? (
          <EmptyState icon={<Users />} title={t('users.empty')} />
        ) : (
          <Table>
            <THead><Tr className="hover:bg-transparent"><Th>{t('users.columns.name')}</Th><Th>{t('users.columns.role')}</Th><Th className="hidden md:table-cell">{t('users.columns.lastLogin')}</Th><Th>{t('users.columns.state')}</Th><Th /></Tr></THead>
            <TBody>
              {query.data.data.map((user) => {
                const active = user.deletedAt === null;
                return (
                  <Tr key={user.id}>
                    <Td><div className="font-medium text-fg">{user.firstName} {user.lastName}</div><div className="text-xs text-fg-muted">{user.email}</div></Td>
                    <Td><span className="text-sm text-fg-secondary">{t(`roles.${user.role}`)}</span></Td>
                    <Td className="hidden text-sm text-fg-secondary md:table-cell">{user.lastLoginAt ? dateFormat.format(new Date(user.lastLoginAt)) : t('users.never')}</Td>
                    <Td><ProjectStatusBadge status={active ? 'ASSIGNED' : 'DRAFT'} /></Td>
                    <Td className="text-right"><Button variant="ghost" size="sm" icon={active ? <UserX /> : <UserCheck />} loading={lifecycle.isPending} onClick={() => void lifecycle.mutateAsync({ id: user.id, active })}>{active ? t('users.deactivate') : t('users.reactivate')}</Button></Td>
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