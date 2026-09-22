import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auditApi } from '@/api/endpoints';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { errorMessage } from '@/utils/errors';

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

/** Journal d'audit (ENF-07) : lecture seule, chaque action tracée en base depuis le début (Phase 1). */
export function AuditPage() {
  const { t } = useTranslation();
  const [action, setAction] = useState('');
  const query = useQuery({
    queryKey: ['audit-logs', action],
    queryFn: () => auditApi.list({ pageSize: 100, action: action || undefined }),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-fg">{t('audit.title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('audit.subtitle')}</p>
      </header>
      <Panel
        title={t('audit.listTitle')}
        actions={<span className="text-xs text-fg-muted">{query.data && t('audit.count', { count: query.data.total })}</span>}
      >
        <div className="border-b border-line p-4">
          <Input value={action} onChange={(event) => setAction(event.target.value)} placeholder={t('audit.filterPlaceholder')} className="max-w-sm" />
        </div>
        {query.isPending ? (
          <div className="p-4">
            <Skeleton className="h-48" />
          </div>
        ) : query.isError ? (
          <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.data.length === 0 ? (
          <EmptyState icon={<ScrollText />} title={t('audit.empty')} />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>{t('audit.columns.date')}</Th>
                <Th>{t('audit.columns.actor')}</Th>
                <Th>{t('audit.columns.action')}</Th>
                <Th className="hidden md:table-cell">{t('audit.columns.target')}</Th>
              </Tr>
            </THead>
            <TBody>
              {query.data.data.map((entry) => (
                <Tr key={entry.id}>
                  <Td className="whitespace-nowrap text-sm text-fg-secondary">{dateTime.format(new Date(entry.createdAt))}</Td>
                  <Td className="text-sm text-fg">{entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : t('audit.systemActor')}</Td>
                  <Td className="font-mono text-xs text-fg">{entry.action}</Td>
                  <Td className="hidden font-mono text-xs text-fg-muted md:table-cell">{entry.targetType}{entry.targetId ? ` · ${entry.targetId.slice(0, 8)}…` : ''}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
