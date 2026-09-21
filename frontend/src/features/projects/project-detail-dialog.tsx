import { ArrowRight, Calculator, ClipboardList, Download, FileSpreadsheet, History, LayoutPanelTop, Undo2, UserPlus } from 'lucide-react';
import { ROLE_HOME } from '@archiflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { AvailableTransition } from '@/api/endpoints';
import { projectsApi, reportsApi, usersApi } from '@/api/endpoints';
import { ProjectStatusBadge } from '@/components/patterns/project-status';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useApplyTransition, useAvailableTransitions, useProject, useProjectHistory } from '@/hooks/use-projects';
import { useCan } from '@/permissions/portals';
import { useSession } from '@/auth/session-store';
import { errorMessage } from '@/utils/errors';
import { RequestOverview } from './request-overview';

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Détail d'un projet et actions de workflow. Les actions proposées viennent du SERVEUR
 * (GET /projects/:id/transitions) : l'interface n'invente aucune transition.
 */
export function ProjectDetailDialog({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const role = useSession((s) => s.profile?.role);
  const project = useProject(projectId);

  return (
    <Dialog open={projectId !== null} onOpenChange={(open) => !open && onClose()}>
      {projectId && (
        <DialogContent
          className="max-w-2xl"
          title={project.data?.name ?? t('common.loading')}
          description={project.data?.clientCompany.name}
        >
          {project.isPending ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24" />
            </div>
          ) : project.isError ? (
            <ErrorState message={errorMessage(t, project.error)} onRetry={() => void project.refetch()} />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col items-start gap-1.5">
                  <span className="text-xs font-medium text-fg-muted">{t('projects.detail.status')}</span>
                  <ProjectStatusBadge status={project.data.status} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-fg-muted">{t('projects.detail.team')}</span>
                  {project.data.assignments.length === 0 ? (
                    <span className="text-sm text-fg-secondary">{t('projects.detail.noTeam')}</span>
                  ) : (
                    <ul className="flex flex-col gap-1 text-sm">
                      {project.data.assignments.map((a) => (
                        <li key={a.id} className="flex justify-between gap-2">
                          <span className="text-fg">
                            {a.user.firstName} {a.user.lastName}
                          </span>
                          <span className="text-fg-secondary">{t(`roles.${a.role}`)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {role && role !== 'CLIENT' && (
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm" icon={<LayoutPanelTop />}>
                    <Link to={`${ROLE_HOME[role]}/projects/${projectId}/design`}>{t('projects.detail.openDesigner')}</Link>
                  </Button>
                  {role === 'ENGINEER' && (
                    <>
                      <Button asChild variant="secondary" size="sm" icon={<ClipboardList />}>
                        <Link to={`${ROLE_HOME[role]}/projects/${projectId}/need-analysis`}>{t('projects.detail.openNeedAnalysis')}</Link>
                      </Button>
                      <Button asChild variant="secondary" size="sm" icon={<Calculator />}>
                        <Link to={`${ROLE_HOME[role]}/projects/${projectId}/sizing`}>{t('projects.detail.openSizing')}</Link>
                      </Button>
                    </>
                  )}
                  <PdfDownloadButton projectId={projectId} />
                </div>
              )}
              {role === 'CLIENT' && (
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm" icon={<LayoutPanelTop />}>
                    <Link to={`/client/projects/${projectId}/design`}>{t('projects.detail.viewArchitecture')}</Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm" icon={<FileSpreadsheet />}>
                    <Link to={`/client/projects/${projectId}/bom`}>{t('projects.detail.viewBom')}</Link>
                  </Button>
                  <PdfDownloadButton projectId={projectId} />
                </div>
              )}
              <RequestOverview request={project.data.request} />
              {role === 'ADMIN' && <AssignmentActions projectId={projectId} />}
              <TransitionActions projectId={projectId} />
              <StatusHistory projectId={projectId} />
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

/** Export PDF (EF-301) — visible à quiconque a bom.read, y compris le CLIENT sur son projet. */
function PdfDownloadButton({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const canDownload = useCan('bom.read');
  const download = useMutation({
    mutationFn: () => reportsApi.downloadPdf(projectId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `architecture-${projectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
  if (!canDownload) return null;
  return (
    <Button variant="secondary" size="sm" icon={<Download />} loading={download.isPending} onClick={() => download.mutate()}>
      {t('bom.downloadPdf')}
    </Button>
  );
}

function AssignmentActions({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<'ENGINEER' | 'ARCHITECT' | 'PROJECT_MANAGER' | 'SALES'>('ENGINEER');
  const [userId, setUserId] = useState('');
  const users = useQuery({ queryKey: ['assignable-users', role], queryFn: () => usersApi.list({ role, pageSize: 100 }) });
  const assign = useMutation({
    mutationFn: () => projectsApi.assign(projectId, { userId, role }),
    onSuccess: () => {
      setUserId('');
      void queryClient.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
    },
  });
  const candidates = users.data?.data ?? [];
  return <section className="flex flex-col gap-3 rounded-card border border-line bg-inset p-4"><h3 className="flex items-center gap-2 text-sm font-semibold text-fg"><UserPlus className="size-4 text-primary" />{t('projects.detail.assignTitle')}</h3><div className="grid gap-3 sm:grid-cols-[170px_1fr_auto]"><select aria-label={t('projects.detail.assignRole')} className="h-9 rounded-field border border-line bg-surface px-2 text-sm text-fg" value={role} onChange={(event) => { setRole(event.target.value as typeof role); setUserId(''); }}><option value="ENGINEER">{t('roles.ENGINEER')}</option><option value="ARCHITECT">{t('roles.ARCHITECT')}</option><option value="PROJECT_MANAGER">{t('roles.PROJECT_MANAGER')}</option><option value="SALES">{t('roles.SALES')}</option></select><select aria-label={t('projects.detail.assignUser')} className="h-9 rounded-field border border-line bg-surface px-2 text-sm text-fg" value={userId} onChange={(event) => setUserId(event.target.value)} disabled={users.isPending}><option value="">{users.isPending ? t('common.loading') : t('projects.detail.chooseUser')}</option>{candidates.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}</select><Button size="sm" icon={<UserPlus />} disabled={!userId} loading={assign.isPending} onClick={() => void assign.mutateAsync()}>{t('projects.detail.assign')}</Button></div>{users.isError && <Alert tone="critical">{t('errors.INTERNAL')}</Alert>}{assign.isError && <Alert tone="critical">{errorMessage(t, assign.error)}</Alert>}</section>;
}

function TransitionActions({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const transitions = useAvailableTransitions(projectId);
  const apply = useApplyTransition(projectId);
  const [reverse, setReverse] = useState<AvailableTransition | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();

  const run = (transition: AvailableTransition) => {
    if (transition.requiresReason && reverse?.to !== transition.to) {
      setReverse(transition);
      setReason('');
      setReasonError(undefined);
      return;
    }
    if (transition.requiresReason && !reason.trim()) {
      setReasonError(t('validation.reason.required'));
      return;
    }
    apply.mutate(
      { to: transition.to, reason: transition.requiresReason ? reason.trim() : undefined },
      { onSuccess: () => setReverse(null) },
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-fg">{t('projects.detail.actions')}</h3>
      {apply.isError && <Alert tone="critical">{errorMessage(t, apply.error)}</Alert>}
      {transitions.isPending ? (
        <Skeleton className="h-9 w-64" />
      ) : transitions.isError ? (
        <Alert tone="critical">{errorMessage(t, transitions.error)}</Alert>
      ) : transitions.data.length === 0 ? (
        <p className="text-sm text-fg-secondary">{t('workflow.noAction')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {transitions.data.map((transition) => (
            <Button
              key={transition.to}
              variant={transition.requiresReason ? 'secondary' : 'primary'}
              icon={transition.requiresReason ? <Undo2 /> : <ArrowRight />}
              loading={apply.isPending && !reverse && apply.variables?.to === transition.to}
              disabled={apply.isPending}
              onClick={() => run(transition)}
            >
              {t(transition.labelKey)}
            </Button>
          ))}
        </div>
      )}
      {reverse && (
        <div className="flex flex-col gap-3 rounded-card border border-warning/40 bg-warning/5 p-4">
          <Alert tone="warning">{t('workflow.reverseNotice')}</Alert>
          <Field label={t('workflow.reason')} error={reasonError}>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(undefined);
              }}
              placeholder={t('workflow.reasonPlaceholder')}
              className="w-full rounded-field border border-line bg-inset px-3 py-2 text-sm text-fg placeholder:text-fg-muted hover:border-line-strong focus-visible:border-primary aria-invalid:border-critical"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReverse(null)}>
              {t('common.cancel')}
            </Button>
            <Button icon={<Undo2 />} loading={apply.isPending} onClick={() => run(reverse)}>
              {t(reverse.labelKey)}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusHistory({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const history = useProjectHistory(projectId);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <History className="size-4 text-fg-muted" aria-hidden="true" />
        {t('projects.detail.history')}
      </h3>
      {history.isPending ? (
        <Skeleton className="h-16" />
      ) : history.isError ? (
        <Alert tone="critical">{errorMessage(t, history.error)}</Alert>
      ) : history.data.length === 0 ? (
        <p className="text-sm text-fg-secondary">{t('projects.detail.noHistory')}</p>
      ) : (
        <ol className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
          {history.data.map((entry) => (
            <li key={entry.id} data-testid="history-entry" className="flex flex-col gap-1 rounded-field border border-line bg-inset p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <ProjectStatusBadge status={entry.fromStatus} />
                <ArrowRight className="size-3.5 text-fg-muted" aria-hidden="true" />
                <ProjectStatusBadge status={entry.toStatus} />
                <span className="ml-auto text-xs text-fg-muted tabular">{dateTime.format(new Date(entry.createdAt))}</span>
              </div>
              {entry.reason && (
                <p className="text-sm text-fg-secondary">
                  <span className="font-medium text-fg">{t('projects.detail.reasonLabel')}</span> {entry.reason}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
