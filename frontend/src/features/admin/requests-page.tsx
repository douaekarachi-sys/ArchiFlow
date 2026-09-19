import type { ProjectStatus } from '@archiflow/shared';
import { Inbox, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectSummary } from '@/api/endpoints';
import { ProjectStatusBadge } from '@/components/patterns/project-status';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useProjects } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';
import { ProjectDetailDialog } from '../projects/project-detail-dialog';

type QueueFilter = 'all' | 'submitted' | 'assignment';
const QUEUE_STATUSES: Record<Exclude<QueueFilter, 'all'>, ProjectStatus> = { submitted: 'SUBMITTED', assignment: 'PENDING_ASSIGNMENT' };

export function AdminRequestsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useProjects({ pageSize: 100, q: search || undefined });
  const requests = query.data?.data.filter((project) => filter === 'all' ? project.status === 'SUBMITTED' || project.status === 'PENDING_ASSIGNMENT' : project.status === QUEUE_STATUSES[filter]) ?? [];

  return <div className="dashboard-shell -mx-4 -my-6 min-h-[calc(100dvh-3.5rem)] px-4 pb-8 md:-mx-8 md:-my-8 md:px-8"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-[hsl(var(--dashboard-line))] py-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--dashboard-purple))]">{t('adminRequests.eyebrow')}</p><h1 className="mt-2 text-2xl font-semibold text-[hsl(var(--dashboard-text))]">{t('adminRequests.title')}</h1><p className="mt-1 text-sm text-[hsl(var(--dashboard-muted))]">{t('adminRequests.subtitle')}</p></div><label className="dashboard-search flex w-full max-w-xs items-center gap-2 rounded-field px-3 py-2"><Search className="size-4 text-[hsl(var(--dashboard-muted))]" /><span className="sr-only">{t('adminRequests.search')}</span><input aria-label={t('adminRequests.search')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('adminRequests.search')} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></header><nav className="flex gap-2 overflow-x-auto py-4" aria-label={t('adminRequests.filters')}>{(['all', 'submitted', 'assignment'] as QueueFilter[]).map((key) => <Button key={key} type="button" variant={filter === key ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter(key)}>{t(`adminRequests.filter.${key}`)}</Button>)}</nav>{query.isPending ? <QueueSkeleton /> : query.isError ? <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} /> : requests.length === 0 ? <EmptyState icon={<Inbox />} title={t('adminRequests.empty')} description={t('adminRequests.emptyHint')} /> : <section className="dashboard-request-queue overflow-hidden rounded-card border border-[hsl(var(--dashboard-line))]"><div className="dashboard-projects-columns hidden border-b border-[hsl(var(--dashboard-line))] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--dashboard-muted))] md:grid md:grid-cols-[minmax(250px,1.5fr)_minmax(180px,1fr)_160px_140px_24px] md:gap-4"><span>{t('projects.columns.name')}</span><span>{t('projects.columns.client')}</span><span>{t('projects.columns.status')}</span><span>{t('projects.columns.updated')}</span><span /></div>{requests.map((project) => <RequestRow key={project.id} project={project} onOpen={() => setOpenId(project.id)} />)}</section>}<ProjectDetailDialog projectId={openId} onClose={() => setOpenId(null)} /></div>;
}

function RequestRow({ project, onOpen }: { project: ProjectSummary; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="dashboard-project-row group grid w-full items-center gap-4 px-5 py-4 text-left md:grid-cols-[minmax(250px,1.5fr)_minmax(180px,1fr)_160px_140px_24px]"><span><strong className="block truncate text-sm text-[hsl(var(--dashboard-text))]">{project.name}</strong><small className="text-xs text-[hsl(var(--dashboard-muted))] md:hidden">{project.clientCompany.name}</small></span><span className="hidden truncate text-sm text-[hsl(var(--dashboard-blue))] md:block">{project.clientCompany.name}</span><ProjectStatusBadge status={project.status} /><span className="hidden text-sm text-[hsl(var(--dashboard-blue))] lg:block">{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(project.updatedAt))}</span><span className="text-right text-[hsl(var(--dashboard-purple))]">›</span></button>;
}

function QueueSkeleton() {
  return <div className="dashboard-request-queue flex flex-col gap-4 rounded-card border border-[hsl(var(--dashboard-line))] p-5">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12" />)}</div>;
}
