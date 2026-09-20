import type { Role } from '@archiflow/shared';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectSummary } from '@/api/endpoints';
import { ProjectStatusBadge } from '@/components/patterns/project-status';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useProjects } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';
import { ProjectDetailDialog } from './project-detail-dialog';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Liste des projets visibles par l'utilisateur — avec ses trois états : chargement, vide, erreur. */
export function ProjectsPanel({ role, search }: { role: Role; search?: string }) {
  const { t } = useTranslation();
  const query = useProjects({ pageSize: 50, q: search || undefined });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id="projects-list" className="dashboard-projects overflow-hidden rounded-card border border-[hsl(var(--dashboard-line))]">
      <header className="dashboard-projects-header flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[hsl(var(--dashboard-text))]">{t('projects.title')}</h2>
          <p className="mt-0.5 text-xs text-[hsl(var(--dashboard-muted))]">{t('projects.subtitle')}</p>
        </div>
        {query.data && <span className="text-xs text-[hsl(var(--dashboard-muted))]">{t('projects.count', { count: query.data.total })}</span>}
      </header>
      {query.isPending ? (
        <ProjectsSkeleton />
      ) : query.isError ? (
        <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={<FolderOpen />}
          title={t('projects.empty.title')}
          description={t(`projects.empty.${role === 'CLIENT' || role === 'ADMIN' ? role : 'default'}`)}
        />
      ) : (
        <div>
          <div className="dashboard-projects-columns hidden border-y border-[hsl(var(--dashboard-line))] px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--dashboard-muted))] md:grid md:grid-cols-[minmax(260px,1.7fr)_minmax(160px,0.9fr)_minmax(150px,0.8fr)_140px_24px] md:gap-4">
            <span>{t('projects.columns.name')}</span><span>{t('projects.columns.client')}</span><span>{t('projects.columns.status')}</span><span>{t('projects.columns.updated')}</span><span />
          </div>
          <div>{query.data.data.map((project) => <ProjectRow key={project.id} project={project} onOpen={() => setOpenId(project.id)} />)}</div>
        </div>
      )}
      <ProjectDetailDialog projectId={openId} onClose={() => setOpenId(null)} />
    </section>
  );
}

function ProjectRow({ project, onOpen }: { project: ProjectSummary; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="dashboard-project-row group grid w-full items-center gap-4 px-5 py-4 text-left md:grid-cols-[minmax(260px,1.7fr)_minmax(160px,0.9fr)_minmax(150px,0.8fr)_140px_24px]">
    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[hsl(var(--dashboard-text))]">{project.name}</span><span className="mt-1 block truncate text-xs text-[hsl(var(--dashboard-muted))] md:hidden">{project.clientCompany.name}</span></span>
    <span className="hidden truncate text-sm text-[hsl(var(--dashboard-text))] md:block">{project.clientCompany.name}</span>
    <span><ProjectStatusBadge status={project.status} /></span>
    <span className="hidden text-sm tabular text-[hsl(var(--dashboard-muted))] lg:block">{dateFormat.format(new Date(project.updatedAt))}</span>
    <ChevronRight className="size-4 text-[hsl(var(--dashboard-muted))] transition-transform group-hover:translate-x-1 group-hover:text-[hsl(var(--dashboard-purple))]" aria-hidden="true" />
  </button>;
}

function ProjectsSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="grid h-16 items-center gap-4 border-b border-[hsl(var(--dashboard-line))] px-5 last:border-b-0 md:grid-cols-[minmax(260px,1.7fr)_minmax(160px,0.9fr)_minmax(150px,0.8fr)_140px_24px]">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="hidden h-4 w-32 md:block" />
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}
