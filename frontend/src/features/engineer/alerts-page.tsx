import { ROLE_HOME } from '@archiflow/shared';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useSession } from '@/auth/session-store';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { DOT_CLASS } from '@/features/designer/validation-panel';
import { useProjectAnomalies } from '@/hooks/use-project-anomalies';
import { errorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

/**
 * Alertes (Ingénieur, T16 point 2) — VUE DÉRIVÉE : agrège les anomalies CRITICAL/WARNING que
 * les moteurs de capacité/compatibilité/structure/adressage/placement (T4, T11, T12) calculent
 * déjà, sur tous les projets visibles par l'ingénieur. Aucun nouveau modèle, aucun nouveau calcul.
 */
export function AlertsPage() {
  const { t } = useTranslation();
  const role = useSession((s) => s.profile?.role);
  const { anomalies, projects, isLoading } = useProjectAnomalies();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.alerts')} subtitle={t('engineerAlerts.subtitle')} />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : projects.isError ? (
        <ErrorState message={errorMessage(t, projects.error)} onRetry={() => void projects.refetch()} />
      ) : anomalies.length === 0 ? (
        <EmptyState icon={<AlertTriangle />} title={t('engineerAlerts.empty')} description={t('engineerAlerts.emptyHint')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {[...anomalies]
            .sort((a, b) => (a.anomaly.severity === 'CRITICAL' ? -1 : 1) - (b.anomaly.severity === 'CRITICAL' ? -1 : 1))
            .map(({ project, anomaly }, i) => (
              <li key={`${project.id}-${i}`} className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
                <span className={cn('mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full', DOT_CLASS[anomaly.severity])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{t(anomaly.code, anomaly.params ?? {})}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {anomaly.severity} ·{' '}
                    {role && (
                      <Link to={`${ROLE_HOME[role]}/projects/${project.id}/design`} className="text-primary hover:underline">
                        {project.name}
                      </Link>
                    )}
                  </p>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
