import type { Role } from '@archiflow/shared';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Calculator, CircleAlert, CircleCheckBig, ClipboardList,
  FolderKanban, LayoutPanelTop, Network, Search, Send, Users, type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ProjectSummary } from '@/api/endpoints';
import { usersApi } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { MultiColumnStat, type StatColumn } from '@/components/ui/multi-column-stat';
import { Panel } from '@/components/ui/panel';
import { RankedList } from '@/components/ui/ranked-list';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useAvailableTransitions, useProjects } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';
import { ProjectDetailDialog } from '../projects/project-detail-dialog';
import { ProjectsPanel } from '../projects/projects-panel';
import { CLIENT_STAGES, clientStage, clientStageIndex } from './client-progress';
import { staleProjects } from './stale-projects';
import { dashboardStats, type Stat, type StatTone } from './stats';
import { statusSegments } from './status-groups';

const TONE_ICON: Record<StatTone, LucideIcon> = {
  primary: Calculator,
  warning: CircleAlert,
  success: CircleCheckBig,
  info: Send,
  neutral: Users,
};

/**
 * Tableau de bord d'un portail. Un rôle = des données réellement disponibles pour ce rôle
 * (le serveur a déjà appliqué la portée de visibilité) — jamais la même page recolorée.
 */
export function DashboardPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const projects = useProjects({ pageSize: 100 });
  const canCountUsers = role === 'ADMIN';
  const users = useQuery({ queryKey: ['users', 'count'], queryFn: usersApi.count, enabled: canCountUsers });

  const stats = projects.data
    ? dashboardStats(role, projects.data.data, { activeUsers: canCountUsers ? users.data?.total : undefined })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3 border-b border-line pb-4">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-fg-muted" aria-hidden="true" />
          <span className="sr-only">{t('dashboard.search')}</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('dashboard.search')}
            className="h-9 w-full rounded-field border border-line bg-inset pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted"
          />
        </label>
        <div className="relative">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-fg-muted transition-colors hover:text-fg"
            aria-label={t('dashboard.notifications')}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <CircleAlert className="size-4" />
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-11 z-20 min-w-56 rounded-card border border-line bg-elevated p-3 text-xs shadow-elevated">
              <strong className="text-fg">{t('dashboard.notifications')}</strong>
              <p className="mt-1 text-fg-muted">{t('dashboard.noNotifications')}</p>
            </div>
          )}
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-card bg-primary text-on-solid">
            <Network className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.01em] text-fg">{t(`portal.${role}.title`)}</h1>
            <p className="text-sm text-fg-secondary">{t(`roles.${role}`)}</p>
          </div>
        </div>
        {role !== 'CLIENT' && (
          <Button variant="secondary" size="sm" onClick={() => document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('dashboard.new')}
          </Button>
        )}
      </section>

      <RoleDashboard role={role} projects={projects} stats={stats} search={search} />
    </div>
  );
}

function RoleDashboard({
  role,
  projects,
  stats,
  search,
}: {
  role: Role;
  projects: ReturnType<typeof useProjects>;
  stats: Stat[] | null;
  search: string;
}) {
  const { t } = useTranslation();

  if (projects.isPending) return <DashboardSkeleton />;
  if (projects.isError) return <ErrorState message={errorMessage(t, projects.error)} onRetry={() => void projects.refetch()} />;

  if (role === 'CLIENT') return <ClientWorkspace projects={projects.data.data} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ProjectsStatusCard projects={projects.data.data} />
        {stats && <RoleMetrics stats={stats} />}
      </div>
      {role === 'ENGINEER' && <EngineerTools />}
      {role === 'ARCHITECT' && <ArchitectTools mostRecentProjectId={projects.data.data[0]?.id ?? null} />}
      {(role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'SALES') && (
        <Panel title={t('dashboard.staleProjects')}>
          <StaleList projects={projects.data.data} />
        </Panel>
      )}
      <ProjectsPanel role={role} search={search} />
    </div>
  );
}

function StaleList({ projects }: { projects: ProjectSummary[] }) {
  const { t } = useTranslation();
  const items = useMemo(() => staleProjects(projects), [projects]);
  if (items.length === 0) {
    return <p className="p-4 text-sm text-fg-secondary">{t('dashboard.staleProjectsEmpty')}</p>;
  }
  return <RankedList className="px-4 pb-2" items={items} />;
}

function ProjectsStatusCard({ projects }: { projects: ProjectSummary[] }) {
  const { t } = useTranslation();
  const segments = useMemo(() => statusSegments(projects, (group) => t(`dashboard.statusGroups.${group}`)), [projects, t]);
  return (
    <KpiCard
      title={t('dashboard.stats.total')}
      subtitle={t('dashboard.byStatus')}
      value={projects.length}
      valueLabel={t('dashboard.projectsCountLabel')}
      segments={segments.length > 0 ? segments : undefined}
    >
      {segments.length === 0 && <p className="mt-4 text-sm text-fg-secondary">{t('projects.empty.title')}</p>}
    </KpiCard>
  );
}

function RoleMetrics({ stats }: { stats: Stat[] }) {
  const { t } = useTranslation();
  const columns: StatColumn[] = stats
    .filter((stat) => stat.key !== 'total')
    .map((stat) => ({ key: stat.key, icon: <StatIcon tone={stat.tone} />, label: t(`dashboard.stats.${stat.key}`), value: stat.value }));
  if (columns.length === 0) return null;
  return <MultiColumnStat columns={columns} />;
}

function StatIcon({ tone }: { tone: StatTone }) {
  const Icon = TONE_ICON[tone];
  return <Icon />;
}

function EngineerTools() {
  const { t } = useTranslation();
  return (
    <Panel title={t('dashboard.engineerTools')}>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <ToolLink to="/engineer/need-analysis" icon={<ClipboardList />} label={t('nav.needAnalysis')} />
        <ToolLink to="/engineer/sizing" icon={<Calculator />} label={t('nav.sizing')} />
        <ToolLink to="/engineer/catalog" icon={<BookOpen />} label={t('nav.catalog')} />
      </div>
    </Panel>
  );
}

function ArchitectTools({ mostRecentProjectId }: { mostRecentProjectId: string | null }) {
  const { t } = useTranslation();
  if (!mostRecentProjectId) return null;
  return (
    <Panel title={t('dashboard.architectTools')}>
      <div className="p-4">
        <ToolLink to={`/architect/projects/${mostRecentProjectId}/design`} icon={<LayoutPanelTop />} label={t('projects.detail.openDesigner')} />
      </div>
    </Panel>
  );
}

function ToolLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-card border border-line bg-inset px-4 py-3 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-field bg-primary-soft text-primary-text [&_svg]:size-4">{icon}</span>
      {label}
    </Link>
  );
}

/** Portail client (EF-506/507) : son projet, sa progression, sa prochaine action — jamais le jargon interne. */
function ClientWorkspace({ projects }: { projects: ProjectSummary[] }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const primary = projects[0] ?? null; // le plus récemment mis à jour (tri serveur)
  const transitions = useAvailableTransitions(primary?.id ?? null);

  if (!primary) {
    return <EmptyState icon={<FolderKanban />} title={t('projects.empty.title')} description={t('projects.empty.CLIENT')} className="py-16" />;
  }

  const nextAction = transitions.data?.[0] ? t(transitions.data[0].labelKey) : t('dashboard.clientNextStep');

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <button type="button" onClick={() => setOpenId(primary.id)} className="rounded-card border border-line bg-surface p-6 text-left shadow-elevated">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-text">{t('dashboard.clientProgress')}</p>
        <h2 className="mt-2 text-xl font-semibold text-fg">{primary.name}</h2>
        <div className="mt-8 flex items-center gap-2">
          {CLIENT_STAGES.map((stage, index) => {
            const active = index <= clientStageIndex(primary.status);
            return (
              <div key={stage} className="flex flex-1 items-center gap-2">
                <span className={`size-3 rounded-full ${active ? 'bg-primary' : 'bg-line'}`} aria-hidden="true" />
                <span className="hidden text-xs text-fg-muted sm:block">{t(`dashboard.clientSteps.${stage}`)}</span>
                {index < CLIENT_STAGES.length - 1 && <span className="h-px flex-1 bg-line" />}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-fg-secondary">{nextAction}</p>
      </button>
      <SummaryCard icon={<FolderKanban />} title={t('dashboard.myProjects')} value={projects.length} detail={t('dashboard.clientView')} />
      <div className="xl:col-span-2">
        <ClientProjectList projects={projects} onOpen={setOpenId} />
      </div>
      <ProjectDetailDialog projectId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Liste « propre » côté client : ni société (c'est la sienne), ni statut interne — juste l'étape. */
function ClientProjectList({ projects, onOpen }: { projects: ProjectSummary[]; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <Panel title={t('dashboard.myProjects')}>
      <ul>
        {projects.map((project) => (
          <li key={project.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(project.id)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-inset"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{project.name}</span>
              <Badge tone="info">{t(`dashboard.clientSteps.${clientStage(project.status)}`)}</Badge>
              <span className="hidden shrink-0 text-xs tabular text-fg-muted sm:block">{dateFormat.format(new Date(project.updatedAt))}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SummaryCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value?: number | string; detail: string }) {
  return (
    <article className="rounded-card border border-line bg-surface p-4 shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary-text">
            {icon}
            {title}
          </div>
          <p className="mt-1 text-xs text-fg-muted">{detail}</p>
        </div>
        {value !== undefined && <strong className="text-2xl font-medium text-primary-text">{value}</strong>}
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}
