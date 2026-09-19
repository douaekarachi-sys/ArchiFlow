import type { Role } from '@archiflow/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Box, CircleAlert, Edit3, Expand, FolderKanban, Gauge, MapPin,
  Network, Search, Settings2, Tag, Users, type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { usersApi } from '@/api/endpoints';
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
  const [expanded, setExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const projects = useProjects({ pageSize: 100, q: search || undefined });
  const canCountUsers = useCan('user.read') && role === 'ADMIN';
  const users = useQuery({ queryKey: ['users', 'count'], queryFn: usersApi.count, enabled: canCountUsers });

  const stats = projects.data
    ? dashboardStats(role, projects.data.data, { activeUsers: canCountUsers ? users.data?.total : undefined })
    : null;
  const [selectedNode, setSelectedNode] = useState('core');
  const selectedProject = projects.data?.data[0];

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
        <button type="button" className="dashboard-new-button" onClick={() => role === 'CLIENT' ? void navigate('/client/request') : document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' })}><span>+</span><span className="hidden sm:inline">{t('dashboard.new')}</span></button>
        {notificationsOpen && <div className="dashboard-notification-popover"><strong>{t('dashboard.notifications')}</strong><span>{t('dashboard.noNotifications')}</span></div>}
      </header>

      <section className="dashboard-context flex flex-wrap items-center justify-between gap-4 border-b border-[hsl(var(--dashboard-line))] py-5">
        <div className="flex items-center gap-4">
          <div className="dashboard-app-icon"><Network className="size-6" /></div>
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.03em] text-[hsl(var(--dashboard-text))]">{selectedProject?.name ?? t(`portal.${role}.title`)}</h1>
            <p className="text-sm text-[hsl(var(--dashboard-muted))]">{t('dashboard.workspaceType')} · {t(`roles.${role}`)}</p>
            <p className="mt-1 text-[11px] text-[hsl(var(--dashboard-muted))]">{t('dashboard.updated')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="dashboard-context-chip"><MapPin className="size-4" /><span>{t('dashboard.location')}</span><Edit3 className="ml-auto size-3.5 opacity-50" /></div>
          <div className="dashboard-context-chip"><Users className="size-4" /><span>{t(`roles.${role}`)}</span><Edit3 className="ml-auto size-3.5 opacity-50" /></div>
          <button type="button" className="dashboard-edit-button" onClick={() => setActiveTab('diagram')}><Edit3 className="size-4" /> <span className="hidden sm:inline">{t('dashboard.edit')}</span></button>
        </div>
      </section>

      <nav className="dashboard-tabs flex gap-7 overflow-x-auto border-b border-[hsl(var(--dashboard-line))] pt-1" aria-label={t('dashboard.tabsLabel')}>
        {dashboardTabs.map(({ key, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`dashboard-tab ${activeTab === key ? 'is-active' : ''}`}>
            <Icon className="size-4" /> {t(`dashboard.tabs.${key}`)}
          </button>
        ))}
      </nav>

      <RoleDashboard
        role={role}
        activeTab={activeTab}
        expanded={expanded}
        stats={stats}
        search={search}
        selectedNode={selectedNode}
        onSelectNode={setSelectedNode}
        onExpand={() => setExpanded((value) => !value)}
        onDiagram={() => setActiveTab('diagram')}
      />
    </div>
  );
}

function RoleDashboard({
  role,
  activeTab,
  expanded,
  stats,
  search,
  selectedNode,
  onSelectNode,
  onExpand,
  onDiagram,
}: {
  role: Role;
  activeTab: string;
  expanded: boolean;
  stats: ReturnType<typeof dashboardStats> | null;
  search: string;
  selectedNode: string;
  onSelectNode: (node: string) => void;
  onExpand: () => void;
  onDiagram: () => void;
}) {
  if (role === 'CLIENT') return <ClientWorkspace search={search} />;
  if (role === 'ENGINEER') return <EngineerWorkspace activeTab={activeTab} expanded={expanded} stats={stats} selectedNode={selectedNode} onSelectNode={onSelectNode} onExpand={onExpand} onDiagram={onDiagram} search={search} />;
  if (role === 'ARCHITECT') return <ArchitectWorkspace activeTab={activeTab} expanded={expanded} selectedNode={selectedNode} onSelectNode={onSelectNode} onExpand={onExpand} search={search} />;
  if (role === 'PROJECT_MANAGER') return <ManagerWorkspace stats={stats} search={search} />;
  if (role === 'SALES') return <SalesWorkspace stats={stats} search={search} />;
  return <AdminWorkspace stats={stats} search={search} />;
}

function ClientWorkspace({ search }: { search: string }) {
  const { t } = useTranslation();
  return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="dashboard-client-welcome rounded-card border border-[hsl(var(--dashboard-line))] p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--dashboard-purple))]">{t('dashboard.clientProgress')}</p><h2 className="mt-3 text-2xl font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.clientNextStep')}</h2><div className="mt-8 flex items-center gap-2">{['request', 'analysis', 'design', 'validation'].map((step, index) => <div key={step} className="flex flex-1 items-center gap-2"><span className={`size-3 rounded-full ${index === 0 ? 'bg-[hsl(var(--dashboard-purple))]' : 'bg-[hsl(var(--dashboard-line))]'}`} /><span className="hidden text-xs text-[hsl(var(--dashboard-muted))] sm:block">{t(`dashboard.clientSteps.${step}`)}</span>{index < 3 && <span className="h-px flex-1 bg-[hsl(var(--dashboard-line))]" />}</div>)}</div></section><div className="grid gap-4"><SummaryCard icon={<FolderKanban />} title={t('dashboard.myProjects')} value="-" detail={t('dashboard.clientView')} /><SummaryCard icon={<Activity />} title={t('dashboard.lastActivity')} value="-" detail={t('dashboard.clientView')} /></div><div className="xl:col-span-2"><ProjectsPanel role="CLIENT" search={search} /></div></div>;
}

function EngineerWorkspace({ activeTab, expanded, stats, selectedNode, onSelectNode, onExpand, onDiagram, search }: { activeTab: string; expanded: boolean; stats: ReturnType<typeof dashboardStats> | null; selectedNode: string; onSelectNode: (node: string) => void; onExpand: () => void; onDiagram: () => void; search: string }) {
  const { t } = useTranslation();
  if (activeTab === 'activity') return <ActivityPanel />;
  return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1.6fr)_300px]"><DiagramCard expanded={expanded} selectedNode={selectedNode} onSelectNode={onSelectNode} onExpand={onExpand} onDiagram={onDiagram} /><aside className="grid content-start gap-4"><SummaryCard icon={<Gauge />} title={t('dashboard.capacity')} value={stats?.find((stat) => stat.key === 'toProcess')?.value ?? 0} detail={t('dashboard.toReview')} /><SummaryCard icon={<CircleAlert />} title={t('dashboard.alerts')} value="0" detail={t('dashboard.noCritical')} /><SummaryCard icon={<Box />} title={t('dashboard.devices')} value={stats?.[0]?.value ?? 0} detail={t('dashboard.associated')} /></aside><div className="xl:col-span-2"><ProjectsPanel role="ENGINEER" search={search} /></div></div>;
}

function ArchitectWorkspace({ activeTab, expanded, selectedNode, onSelectNode, onExpand, search }: { activeTab: string; expanded: boolean; selectedNode: string; onSelectNode: (node: string) => void; onExpand: () => void; search: string }) {
  const { t } = useTranslation();
  if (activeTab === 'activity') return <ActivityPanel />;
  return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_260px]"><DiagramCard expanded={expanded} selectedNode={selectedNode} onSelectNode={onSelectNode} onExpand={onExpand} onDiagram={() => undefined} /><aside className="dashboard-layer-list rounded-card border border-[hsl(var(--dashboard-line))] p-4"><h2 className="font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.layers')}</h2>{['Logical network', 'Security zones', 'Physical placement', 'Annotations'].map((layer) => <button key={layer} type="button" className="dashboard-layer-row"><Network className="size-4" />{layer}<span className="ml-auto text-xs">›</span></button>)}</aside><div className="xl:col-span-2"><ProjectsPanel role="ARCHITECT" search={search} /></div></div>;
}

function AdminWorkspace({ stats, search }: { stats: ReturnType<typeof dashboardStats> | null; search: string }) { return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_300px]"><ProjectsPanel role="ADMIN" search={search} /><aside className="grid content-start gap-4"><SummaryCard icon={<Users />} title="Utilisateurs actifs" value={stats?.find((stat) => stat.key === 'activeUsers')?.value ?? '-'} detail="Dans l'organisation" /><SummaryCard icon={<CircleAlert />} title="Alertes" value="0" detail="Aucune alerte critique" /></aside></div>; }

function ManagerWorkspace({ stats, search }: { stats: ReturnType<typeof dashboardStats> | null; search: string }) { return <div className="grid gap-4 pt-4"><ProgressStrip stats={stats} /><ProjectsPanel role="PROJECT_MANAGER" search={search} /></div>; }

function SalesWorkspace({ stats, search }: { stats: ReturnType<typeof dashboardStats> | null; search: string }) { return <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_300px]"><ProjectsPanel role="SALES" search={search} /><aside className="grid content-start gap-4"><SummaryCard icon={<Tag />} title="Propositions" value={stats?.find((stat) => stat.key === 'awaitingClient')?.value ?? 0} detail="À synchroniser avec le client" /><SummaryCard icon={<Gauge />} title="Chiffrage" value="-" detail="Coût total estimé" /></aside></div>; }

function ProgressStrip({ stats }: { stats: ReturnType<typeof dashboardStats> | null }) { const { t } = useTranslation(); return <section className="dashboard-progress-strip rounded-card border border-[hsl(var(--dashboard-line))] p-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.delivery')}</h2><span className="text-sm text-[hsl(var(--dashboard-purple))]">{stats?.[0]?.value ?? 0} projets</span></div><div className="mt-5 grid grid-cols-4 gap-2">{['Analyse', 'Dimensionnement', 'Conception', 'Client'].map((stage, index) => <div key={stage} className="dashboard-stage"><span className={index < 2 ? 'is-done' : ''}>{index < 2 ? '✓' : index + 1}</span><small>{stage}</small></div>)}</div></section>; }

function ActivityPanel() { const { t } = useTranslation(); return <section className="dashboard-activity-panel mt-4 rounded-card border border-[hsl(var(--dashboard-line))] p-6"><Activity className="size-6 text-[hsl(var(--dashboard-purple))]" /><h2 className="mt-4 text-lg font-semibold text-[hsl(var(--dashboard-text))]">{t('dashboard.activityTitle')}</h2><p className="mt-1 text-sm text-[hsl(var(--dashboard-muted))]">{t('dashboard.activityEmpty')}</p></section>; }

function DiagramCard({ expanded, selectedNode, onSelectNode, onExpand, onDiagram }: { expanded: boolean; selectedNode: string; onSelectNode: (node: string) => void; onExpand: () => void; onDiagram: () => void }) { const { t } = useTranslation(); return <section className={`dashboard-map-panel min-h-[480px] overflow-hidden rounded-card border border-[hsl(var(--dashboard-line))] ${expanded ? 'xl:col-span-2' : ''}`} aria-label={t('dashboard.diagram')}><div className="flex items-center justify-between border-b border-[hsl(var(--dashboard-line))] px-5 py-4"><div><h2 className="font-medium text-[hsl(var(--dashboard-text))]">{t('dashboard.diagram')}</h2><p className="text-xs text-[hsl(var(--dashboard-muted))]">{t('dashboard.diagramHint')}</p></div><div className="flex gap-1"><button type="button" className="dashboard-tool-button" aria-label={t('dashboard.editDiagram')} onClick={onDiagram}><Edit3 className="size-4" /></button><button type="button" className="dashboard-tool-button" aria-label={t('dashboard.expandDiagram')} aria-pressed={expanded} onClick={onExpand}><Expand className="size-4" /></button></div></div><ArchitectureMap selectedNode={selectedNode} onSelect={onSelectNode} /></section>; }

function SummaryCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value: number | string; detail: string }) {
  return <article className="dashboard-summary-card rounded-card border border-[hsl(var(--dashboard-line))] p-4"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--dashboard-purple))]">{icon}{title}</div><p className="mt-1 text-xs text-[hsl(var(--dashboard-muted))]">{detail}</p></div><strong className="text-2xl font-medium text-[hsl(var(--dashboard-purple))]">{value}</strong></div><div className="mt-4 h-px bg-[hsl(var(--dashboard-line))]" /></article>;
}

function ArchitectureMap({ selectedNode, onSelect }: { selectedNode: string; onSelect: (node: string) => void }) {
  const nodes = [
    { id: 'core', x: 50, y: 49, label: 'Architecture core', type: 'Network' },
    { id: 'server', x: 23, y: 26, label: 'Infrastructure', type: 'Server' },
    { id: 'cloud', x: 77, y: 25, label: 'Cloud services', type: 'Service' },
    { id: 'users', x: 23, y: 73, label: 'Users', type: 'People' },
    { id: 'security', x: 76, y: 72, label: 'Security layer', type: 'Security' },
  ];
  return <div className="dashboard-map relative min-h-[430px] overflow-hidden p-5"><svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 49 C40 40 30 32 23 26 M50 49 C60 38 68 30 77 25 M50 49 C40 60 30 68 23 73 M50 49 C60 59 68 68 76 72" fill="none" stroke="hsl(var(--dashboard-blue))" strokeWidth="0.45" strokeDasharray="1.5 1.2" /></svg>{nodes.map((node) => <button key={node.id} type="button" onClick={() => onSelect(node.id)} className={`dashboard-map-node absolute ${selectedNode === node.id ? 'is-selected' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}><span className="dashboard-node-icon">{node.id === 'core' ? <Network /> : node.id === 'security' ? <Settings2 /> : node.id === 'users' ? <Users /> : <Box />}</span><span className="dashboard-node-copy"><strong>{node.label}</strong><small>{node.type}</small></span></button>)}</div>;
}
