import type { Role } from '@archiflow/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Box, CircleAlert, FolderKanban, Gauge,
  Network, Search, Tag, Users, type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usersApi } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { MultiColumnStat } from '@/components/ui/multi-column-stat';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useProjects } from '@/hooks/use-projects';
import { useCan } from '@/permissions/portals';
import { ProjectsPanel } from '../projects/projects-panel';
import { dashboardStats } from './stats';

const dashboardTabs: Array<{ key: string; icon: LucideIcon }> = [
  { key: 'home', icon: Gauge },
  { key: 'diagram', icon: Network },
  { key: 'requests', icon: FolderKanban },
  { key: 'activity', icon: Activity },
];

/**
 * Tableau de bord d'un portail. Phase 1 : indicateurs calculés sur les projets visibles et liste
 * des projets. Les indicateurs propres à chaque métier s'enrichissent avec leurs phases.
 */
export function DashboardPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const projects = useProjects({ pageSize: 100, q: search || undefined });
  const canCountUsers = useCan('user.read') && role === 'ADMIN';
  const users = useQuery({ queryKey: ['users', 'count'], queryFn: usersApi.count, enabled: canCountUsers });

  const stats = projects.data
    ? dashboardStats(role, projects.data.data, { activeUsers: canCountUsers ? users.data?.total : undefined })
    : null;
  // « Mes projets » : le filtrage réel dépend de données non encore exposées par l'API de liste
  // (créateur, affectation) — voir T2. Le contrôle est déjà en place, « Organisation » est la
  // seule vue qui filtre réellement pour l'instant.
  const [scope, setScope] = useState<'mine' | 'org'>('org');

  return (
    <div className="dashboard-shell -mx-4 -my-6 min-h-[calc(100dvh-3.5rem)] overflow-hidden px-4 pb-8 md:-mx-8 md:-my-8 md:px-8">
      <header className="dashboard-topbar flex items-center gap-3 border-b border-[hsl(var(--dashboard-line))] py-3">
        <label className="dashboard-search flex min-w-0 flex-1 items-center gap-2 rounded-field px-3 py-2">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">{t('dashboard.search')}</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('dashboard.search')} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--dashboard-muted))]" />
          <kbd className="ml-auto hidden rounded border border-current/15 px-1.5 py-0.5 font-mono text-[10px] opacity-60 sm:inline">⌘ K</kbd>
        </label>
        <button type="button" className="dashboard-round-button" aria-label={t('dashboard.notifications')} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><CircleAlert className="size-4" /></button>
        {notificationsOpen && <div className="dashboard-notification-popover"><strong>{t('dashboard.notifications')}</strong><span>{t('dashboard.noNotifications')}</span></div>}
      </header>

      <section className="dashboard-context flex flex-wrap items-center justify-between gap-4 border-b border-[hsl(var(--dashboard-line))] py-5">
        <div className="flex items-center gap-4">
          <div className="dashboard-app-icon"><Network className="size-6" /></div>
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.03em] text-[hsl(var(--dashboard-text))]">{t(`portal.${role}.title`)}</h1>
            <p className="text-sm text-[hsl(var(--dashboard-muted))]">{t(`roles.${role}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {role === 'ADMIN' && (
            <SegmentedControl
              aria-label={t('dashboard.scopeLabel')}
              value={scope}
              onChange={setScope}
              options={[{ value: 'mine', label: t('dashboard.scopeMine') }, { value: 'org', label: t('dashboard.scopeOrg') }]}
            />
          )}
          <button type="button" className="dashboard-new-button" onClick={() => role === 'CLIENT' ? void navigate('/client/request') : document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' })}><span>+</span><span className="hidden sm:inline">{t('dashboard.new')}</span></button>
        </div>
      </section>

      <nav className="dashboard-tabs flex gap-7 overflow-x-auto border-b border-[hsl(var(--dashboard-line))] pt-1" aria-label={t('dashboard.tabsLabel')}>
        {dashboardTabs.map(({ key, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`dashboard-tab ${activeTab === key ? 'is-active' : ''}`}>
            <Icon className="size-4" /> {t(`dashboard.tabs.${key}`)}
          </button>
        ))}
      </nav>

      <RoleDashboard role={role} activeTab={activeTab} stats={stats} search={search} />
    </div>
  );
}

function RoleDashboard({
  role,
  activeTab,
  stats,
  search,
}: {
  role: Role;
  activeTab: string;
  stats: ReturnType<typeof dashboardStats> | null;
  search: string;
}) {
  if (role === 'CLIENT') return <ClientWorkspace stats={stats} search={search} />;
  if (role === 'ENGINEER') return <EngineerWorkspace activeTab={activeTab} stats={stats} search={search} />;
  if (role === 'ARCHITECT') return <ArchitectWorkspace activeTab={activeTab} search={search} />;
  if (role === 'PROJECT_MANAGER') return <ManagerWorkspace stats={stats} search={search} />;
  if (role === 'SALES') return <SalesWorkspace stats={stats} search={search} />;
  return <AdminWorkspace stats={stats} search={search} />;
}

function ClientWorkspace({ stats, search }: { stats: ReturnType<typeof dashboardStats> | null; search: string }) {
  const { t } = useTranslation();
  return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="dashboard-client-welcome rounded-card border border-[hsl(var(--dashboard-line))] p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--dashboard-purple))]">{t('dashboard.clientProgress')}</p><h2 className="mt-3 text-2xl font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.clientNextStep')}</h2><div className="mt-8 flex items-center gap-2">{['request', 'analysis', 'design', 'validation'].map((step, index) => <div key={step} className="flex flex-1 items-center gap-2"><span className={`size-3 rounded-full ${index === 0 ? 'bg-[hsl(var(--dashboard-purple))]' : 'bg-[hsl(var(--dashboard-line))]'}`} /><span className="hidden text-xs text-[hsl(var(--dashboard-muted))] sm:block">{t(`dashboard.clientSteps.${step}`)}</span>{index < 3 && <span className="h-px flex-1 bg-[hsl(var(--dashboard-line))]" />}</div>)}</div></section><div className="grid gap-4"><SummaryCard icon={<FolderKanban />} title={t('dashboard.myProjects')} value={stats?.[0]?.value} detail={t('dashboard.clientView')} /><SummaryCard icon={<Activity />} title={t('dashboard.lastActivity')} detail={t('dashboard.noActivityYet')} /></div><div className="xl:col-span-2"><ProjectsPanel role="CLIENT" search={search} /></div></div>;
}

function EngineerWorkspace({ activeTab, stats, search }: { activeTab: string; stats: ReturnType<typeof dashboardStats> | null; search: string }) {
  const { t } = useTranslation();
  if (activeTab === 'activity') return <ActivityPanel />;
  return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1.6fr)_300px]"><DesignerPlaceholder /><aside className="grid content-start gap-4"><SummaryCard icon={<Gauge />} title={t('dashboard.capacity')} value={stats?.find((stat) => stat.key === 'toProcess')?.value} detail={t('dashboard.toReview')} /><SummaryCard icon={<Box />} title={t('dashboard.devices')} value={stats?.[0]?.value} detail={t('dashboard.associated')} /></aside><div className="xl:col-span-2"><ProjectsPanel role="ENGINEER" search={search} /></div></div>;
}

function ArchitectWorkspace({ activeTab, search }: { activeTab: string; search: string }) {
  const { t } = useTranslation();
  if (activeTab === 'activity') return <ActivityPanel />;
  return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_260px]"><DesignerPlaceholder /><aside className="dashboard-layer-list rounded-card border border-[hsl(var(--dashboard-line))] p-4"><h2 className="font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.layers')}</h2><p className="mt-2 text-xs text-[hsl(var(--dashboard-muted))]">{t('dashboard.layersComingSoon')}</p></aside><div className="xl:col-span-2"><ProjectsPanel role="ARCHITECT" search={search} /></div></div>;
}

function AdminWorkspace({ stats, search }: { stats: ReturnType<typeof dashboardStats> | null; search: string }) {
  const { t } = useTranslation();
  const value = (key: string) => stats?.find((stat) => stat.key === key)?.value ?? 0;
  return (
    <div className="grid gap-4 pt-4">
      <MultiColumnStat
        columns={[
          { key: 'total', icon: <FolderKanban />, label: t('dashboard.stats.total'), value: value('total') },
          { key: 'inProgress', icon: <Gauge />, label: t('dashboard.stats.inProgress'), value: value('inProgress') },
          { key: 'pending', icon: <Activity />, label: t('dashboard.stats.pending'), value: value('pending') },
          { key: 'activeUsers', icon: <Users />, label: t('dashboard.stats.activeUsers'), value: value('activeUsers'), detail: <span className="text-xs text-fg-muted">{t('dashboard.inOrganization')}</span> },
        ]}
      />
      <ProjectsPanel role="ADMIN" search={search} />
    </div>
  );
}

function ManagerWorkspace({ stats, search }: { stats: ReturnType<typeof dashboardStats> | null; search: string }) { return <div className="grid gap-4 pt-4"><ProgressStrip stats={stats} /><ProjectsPanel role="PROJECT_MANAGER" search={search} /></div>; }

function SalesWorkspace({ stats, search }: { stats: ReturnType<typeof dashboardStats> | null; search: string }) { const { t } = useTranslation(); return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_300px]"><ProjectsPanel role="SALES" search={search} /><aside className="grid content-start gap-4"><SummaryCard icon={<Tag />} title={t('dashboard.stats.awaitingClient')} value={stats?.find((stat) => stat.key === 'awaitingClient')?.value} detail={t('dashboard.syncWithClient')} /></aside></div>; }

function ProgressStrip({ stats }: { stats: ReturnType<typeof dashboardStats> | null }) { const { t } = useTranslation(); return <section className="dashboard-progress-strip rounded-card border border-[hsl(var(--dashboard-line))] p-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.delivery')}</h2><span className="text-sm text-[hsl(var(--dashboard-purple))]">{stats?.[0]?.value ?? 0} projets</span></div><div className="mt-5 grid grid-cols-4 gap-2">{['Analyse', 'Dimensionnement', 'Conception', 'Client'].map((stage, index) => <div key={stage} className="dashboard-stage"><span className={index < 2 ? 'is-done' : ''}>{index < 2 ? '✓' : index + 1}</span><small>{stage}</small></div>)}</div></section>; }

function ActivityPanel() { const { t } = useTranslation(); return <section className="dashboard-activity-panel mt-4 rounded-card border border-[hsl(var(--dashboard-line))] p-6"><Activity className="size-6 text-[hsl(var(--dashboard-purple))]" /><h2 className="mt-4 text-lg font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.activityTitle')}</h2><p className="mt-1 text-sm text-[hsl(var(--dashboard-muted))]">{t('dashboard.activityEmpty')}</p></section>; }

/**
 * Le designer 2D (Phase 5) n'existe pas encore : un faux diagramme decoratif occupait cet
 * espace (nœuds fixes, libellés anglais, sans rapport avec le projet réel). Un état honnête
 * vaut mieux qu'une donnée inventée — voir l'audit visuel.
 */
function DesignerPlaceholder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return <section className="dashboard-map-panel flex min-h-[480px] flex-col items-center justify-center gap-3 overflow-hidden rounded-card border border-[hsl(var(--dashboard-line))] p-6 text-center" aria-label={t('dashboard.diagram')}>
    <Network className="size-8 text-[hsl(var(--dashboard-muted))]" aria-hidden="true" />
    <h2 className="font-medium text-[hsl(var(--dashboard-text))]">{t('dashboard.diagram')}</h2>
    <p className="max-w-xs text-sm text-[hsl(var(--dashboard-muted))]">{t('dashboard.diagramComingSoon')}</p>
    <Button size="sm" variant="secondary" onClick={() => void navigate('projects')}>{t('dashboard.diagramAction')}</Button>
  </section>;
}

function SummaryCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value?: number | string; detail: string }) {
  return <article className="dashboard-summary-card rounded-card border border-[hsl(var(--dashboard-line))] p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--dashboard-purple))]">{icon}{title}</div><p className="mt-1 text-xs text-[hsl(var(--dashboard-muted))]">{detail}</p></div>{value !== undefined && <strong className="text-2xl font-medium text-[hsl(var(--dashboard-purple))]">{value}</strong>}</div><div className="mt-4 h-px bg-[hsl(var(--dashboard-line))]" /></article>;
}
