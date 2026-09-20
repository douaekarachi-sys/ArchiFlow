import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { RequestOverview } from '@/features/projects/request-overview';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useProject } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';
import { ProjectPicker } from './project-picker';

/** Point d'entrée du menu (EF-202/Phase 4) : la liste des projets affectés, un outil par-projet. */
export function NeedAnalysisPickerPage() {
  const { t } = useTranslation();
  return (
    <ProjectPicker
      title={t('nav.needAnalysis')}
      description={t('engineer.needAnalysis.pickerDescription')}
      icon={ClipboardList}
      basePath="/engineer"
      linkSuffix="need-analysis"
    />
  );
}

/** Besoin exprimé par le client, en lecture seule, pour le projet affecté (EF-202/Phase 4). */
export function NeedAnalysisDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const project = useProject(projectId ?? null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={project.data?.name ?? t('nav.needAnalysis')} subtitle={t('engineer.needAnalysis.detailDescription')} />
      {project.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      ) : project.isError ? (
        <ErrorState message={errorMessage(t, project.error)} onRetry={() => void project.refetch()} />
      ) : (
        <RequestOverview request={project.data.request} />
      )}
    </div>
  );
}
