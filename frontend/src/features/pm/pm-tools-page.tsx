import { PROJECT_STATUSES, ROLE_HOME, type ProjectStatus } from '@archiflow/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, Clock, KanbanSquare } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { projectsApi, type ProjectSummary } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { STATUS_APPEARANCE } from '@/components/patterns/project-status';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { DOT_CLASS } from '@/features/designer/validation-panel';
import { projectKeys, useProjects } from '@/hooks/use-projects';
import { useProjectAnomalies } from '@/hooks/use-project-anomalies';
import { errorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
/** Un projet immobile plus de deux semaines dans le même statut mérite un coup d'œil (Risques). */
const STALE_DAYS = 14;
const TERMINAL_STATUSES: ProjectStatus[] = ['COMPLETED', 'CLIENT_APPROVED'];

/**
 * Trois vues du portail Chef de projet (T16, point 2) — DÉRIVÉES de la liste de projets déjà
 * chargée et de la machine à états déjà en place : aucun nouveau modèle, à l'exception du seul
 * champ `Project.dueDate` (Planning) explicitement autorisé.
 */

export function PlanningPage() {
  const { t } = useTranslation();
  const role = useSession((s) => s.profile?.role);
  const query = useProjects({ pageSize: 100 });
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string | null }) => projectsApi.update(id, { dueDate }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });

  const rows = [...(query.data?.data ?? [])].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.planning')} subtitle={t('pmTools.planningSubtitle')} />
      {query.isPending ? (
        <Skeleton className="h-64" />
      ) : query.isError ? (
        <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<CalendarClock />} title={t('pmTools.planningEmpty')} />
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((project) => {
            const overdue = project.dueDate && new Date(project.dueDate) < new Date() && !TERMINAL_STATUSES.includes(project.status);
            return (
              <li
                key={project.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-card border p-4',
                  overdue ? 'border-critical/40 bg-critical/5' : 'border-line bg-surface',
                )}
              >
                <div className="min-w-0">
                  {role && (
                    <Link to={`${ROLE_HOME[role]}/projects`} className="block truncate text-sm font-semibold text-fg hover:underline">
                      {project.name}
                    </Link>
                  )}
                  <p className="mt-0.5 text-xs text-fg-muted">{t(`status.${project.status}`)} · {project.clientCompany.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {overdue && <AlertTriangle className="size-4 text-critical-text" aria-hidden="true" />}
                  <Input
                    type="date"
                    aria-label={t('pmTools.dueDate')}
                    value={project.dueDate ? project.dueDate.slice(0, 10) : ''}
                    onChange={(e) => update.mutate({ id: project.id, dueDate: e.target.value || null })}
                    className="w-40"
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function KanbanPage() {
  const { t } = useTranslation();
  const query = useProjects({ pageSize: 100 });
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ProjectStatus | null>(null);

  const onDrop = async (to: ProjectStatus, e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/project-id');
    const from = e.dataTransfer.getData('text/project-status');
    if (!id || from === to) return;
    try {
      await projectsApi.transition(id, { to });
      setError(null);
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    } catch (err) {
      setError(errorMessage(t, err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.kanban')} subtitle={t('pmTools.kanbanSubtitle')} />
      {error && <Alert tone="critical">{error}</Alert>}
      {query.isPending ? (
        <Skeleton className="h-64" />
      ) : query.isError ? (
        <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PROJECT_STATUSES.map((status) => {
            const projects = (query.data?.data ?? []).filter((p) => p.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={(e) => void onDrop(status, e)}
                className={cn(
                  'flex w-64 shrink-0 flex-col gap-2 rounded-card border p-3',
                  dragOver === status ? 'border-primary bg-primary-soft/40' : 'border-line bg-surface',
                )}
              >
                <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  <span>{t(`status.${status}`)}</span>
                  <span>{projects.length}</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/project-id', project.id);
                        e.dataTransfer.setData('text/project-status', project.status);
                      }}
                      className="cursor-grab rounded-field border border-line bg-inset px-3 py-2 text-xs text-fg active:cursor-grabbing"
                    >
                      <p className="truncate font-medium">{project.name}</p>
                      <p className="mt-0.5 truncate text-fg-muted">{project.clientCompany.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface RiskEntry {
  key: string;
  project: ProjectSummary;
  label: string;
  kind: 'anomaly' | 'overdue' | 'stale';
}

export function RisksPage() {
  const { t } = useTranslation();
  const role = useSession((s) => s.profile?.role);
  const { anomalies, projects, isLoading } = useProjectAnomalies();

  const risks: RiskEntry[] = [];
  for (const { project, anomaly } of anomalies) {
    if (anomaly.severity !== 'CRITICAL') continue;
    risks.push({ key: `anomaly-${project.id}-${anomaly.code}-${anomaly.elementIds.join(',')}`, project, label: t(anomaly.code, anomaly.params ?? {}), kind: 'anomaly' });
  }
  const now = Date.now();
  for (const project of projects.data?.data ?? []) {
    if (TERMINAL_STATUSES.includes(project.status)) continue;
    if (project.dueDate && new Date(project.dueDate).getTime() < now) {
      risks.push({ key: `overdue-${project.id}`, project, label: t('pmTools.riskOverdue', { date: dateFormat.format(new Date(project.dueDate)) }), kind: 'overdue' });
    }
    const daysInStatus = Math.floor((now - new Date(project.updatedAt).getTime()) / 86_400_000);
    if (daysInStatus >= STALE_DAYS) {
      risks.push({ key: `stale-${project.id}`, project, label: t('pmTools.riskStale', { days: daysInStatus, status: t(`status.${project.status}`) }), kind: 'stale' });
    }
  }

  const ICONS = { anomaly: AlertTriangle, overdue: CalendarClock, stale: Clock } as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.risks')} subtitle={t('pmTools.risksSubtitle')} />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : projects.isError ? (
        <ErrorState message={errorMessage(t, projects.error)} onRetry={() => void projects.refetch()} />
      ) : risks.length === 0 ? (
        <EmptyState icon={<KanbanSquare />} title={t('pmTools.risksEmpty')} description={t('pmTools.risksEmptyHint')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {risks.map((risk) => {
            const Icon = ICONS[risk.kind];
            return (
              <li key={risk.key} className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                    risk.kind === 'anomaly' ? DOT_CLASS.CRITICAL : 'bg-warning',
                  )}
                >
                  <Icon className="size-3.5 text-white" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{risk.label}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {role && (
                      <Link to={`${ROLE_HOME[role]}/projects`} className="text-primary hover:underline">
                        {risk.project.name}
                      </Link>
                    )}
                    {' · '}
                    {STATUS_APPEARANCE[risk.project.status] && t(`status.${risk.project.status}`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
