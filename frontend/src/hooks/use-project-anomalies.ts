import { validateArchitecture, type Anomaly } from '@archiflow/shared';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { architectureApi, catalogApi, type ProjectSummary } from '@/api/endpoints';
import { architectureKeys } from '@/features/designer/use-architecture';
import { buildEquipmentIndex } from '@/features/designer/validation-panel';
import { useProjects } from './use-projects';

export interface ProjectAnomaly {
  project: ProjectSummary;
  anomaly: Anomaly;
}

/**
 * Agrège, pour TOUS les projets visibles, les anomalies déjà calculées par les moteurs de
 * capacité/compatibilité/structure/adressage/placement (T4, T11, T12) — vue dérivée partagée
 * par « Alertes » (Ingénieur) et « Risques » (Chef de projet). Aucun nouveau modèle.
 */
export function useProjectAnomalies() {
  const projects = useProjects({ pageSize: 100 });
  const catalog = useQuery({ queryKey: ['catalog', 'equipment', 'anomalies'], queryFn: () => catalogApi.equipment({ page: 1, pageSize: 100 }) });
  const equipmentIndex = useMemo(() => buildEquipmentIndex(catalog.data?.data ?? []), [catalog.data?.data]);

  const projectList = useMemo(() => projects.data?.data ?? [], [projects.data]);
  const architectures = useQueries({
    queries: projectList.map((p) => ({
      queryKey: architectureKeys.detail(p.id),
      queryFn: () => architectureApi.get(p.id),
      enabled: projects.isSuccess,
    })),
  });

  const anomalies = useMemo<ProjectAnomaly[]>(() => {
    return projectList.flatMap((project, i) => {
      const doc = architectures[i]?.data;
      if (!doc) return [];
      return validateArchitecture(doc, equipmentIndex)
        .anomalies.filter((a) => a.severity !== 'INFO')
        .map((anomaly) => ({ project, anomaly }));
    });
  }, [projectList, architectures, equipmentIndex]);

  return {
    anomalies,
    projects,
    isLoading: projects.isPending || catalog.isPending || architectures.some((a) => a.isPending),
  };
}
