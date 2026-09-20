import { calculateSizing, type SizingStep } from '@archiflow/shared';
import { Calculator, Gauge, Radio, Server, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useProject } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';
import { ProjectPicker } from './project-picker';

/** Point d'entrée du menu (EF-202/Phase 4) : la liste des projets affectés, un outil par-projet. */
export function SizingPickerPage() {
  const { t } = useTranslation();
  return (
    <ProjectPicker
      title={t('nav.sizing')}
      description={t('engineer.sizing.pickerDescription')}
      icon={Calculator}
      basePath="/engineer"
      linkSuffix="sizing"
    />
  );
}

/**
 * Proposition de dimensionnement chiffrée à partir du besoin client (EF-202, Phase 4) : ports,
 * switches, bande passante, points d'accès, puissance. Chaque carte affiche le détail du calcul,
 * jamais un chiffre seul (brief §9, PHASES.md Phase 4).
 */
export function SizingDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const project = useProject(projectId ?? null);
  const need = project.data?.request;

  const sizing = useMemo(
    () =>
      need
        ? calculateSizing({
            workstationCount: need.workstationCount,
            totalEmployees: need.totalEmployees,
            serverCount: need.serverCount,
            wifi: need.wifi,
          })
        : null,
    [need],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={project.data?.name ?? t('nav.sizing')} subtitle={t('engineer.sizing.detailDescription')} />
      {project.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-40 rounded-card" />)}
        </div>
      ) : project.isError ? (
        <ErrorState message={errorMessage(t, project.error)} onRetry={() => void project.refetch()} />
      ) : !need ? (
        <ErrorState message={t('projects.detail.noRequest')} />
      ) : (
        sizing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              title={t('engineer.sizing.ports.title')}
              subtitle={t('engineer.sizing.ports.subtitle')}
              value={sizing.ports.requiredSwitches}
              valueLabel={t('engineer.sizing.ports.valueLabel', { count: sizing.ports.requiredSwitches })}
            >
              <SizingDetail icon={<Server />} steps={sizing.ports.steps} />
            </KpiCard>
            <KpiCard
              title={t('engineer.sizing.bandwidth.title')}
              subtitle={t('engineer.sizing.bandwidth.subtitle')}
              value={sizing.bandwidth.totalMbps}
              valueLabel="Mb/s"
            >
              <SizingDetail icon={<Gauge />} steps={sizing.bandwidth.steps} />
            </KpiCard>
            <KpiCard
              title={t('engineer.sizing.accessPoints.title')}
              subtitle={t('engineer.sizing.accessPoints.subtitle')}
              value={sizing.accessPoints.recommendedAccessPoints}
              valueLabel={t('engineer.sizing.accessPoints.valueLabel', { count: sizing.accessPoints.recommendedAccessPoints })}
            >
              <SizingDetail icon={<Radio />} steps={sizing.accessPoints.steps} />
            </KpiCard>
            <KpiCard
              title={t('engineer.sizing.power.title')}
              subtitle={t('engineer.sizing.power.subtitle')}
              value={sizing.power.totalWatts}
              valueLabel="W"
            >
              <SizingDetail icon={<Zap />} steps={sizing.power.steps} />
            </KpiCard>
          </div>
        )
      )}
    </div>
  );
}

/** Trace du calcul : jamais un chiffre seul, toujours l'explication qui y mène. */
function SizingDetail({ icon, steps }: { icon: React.ReactNode; steps: SizingStep[] }) {
  const { t } = useTranslation();
  return (
    <Panel className="mt-4 border-line/60 bg-inset">
      <ul className="flex flex-col gap-2 p-3">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2 text-xs text-fg-secondary">
            <span className="mt-0.5 text-fg-muted [&_svg]:size-3.5">{icon}</span>
            <span>{t(step.key, step.params)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
