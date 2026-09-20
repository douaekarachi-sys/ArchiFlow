import type { ProjectStatus } from '@archiflow/shared';
import type { StackedBarSegment } from '@/components/ui/stacked-bar';

export type StatusGroup = 'draft' | 'inProgress' | 'awaitingClient' | 'done';

export const STATUS_GROUPS: readonly StatusGroup[] = ['draft', 'inProgress', 'awaitingClient', 'done'];

/** Regroupement MUTUELLEMENT EXCLUSIF des 13 statuts internes — la somme vaut toujours le total. */
const GROUP_BY_STATUS: Record<ProjectStatus, StatusGroup> = {
  DRAFT: 'draft',
  SUBMITTED: 'inProgress',
  PENDING_ASSIGNMENT: 'inProgress',
  ASSIGNED: 'inProgress',
  ENGINEERING: 'inProgress',
  ARCHITECTURE: 'inProgress',
  INTERNAL_REVIEW: 'inProgress',
  COMMERCIAL_REVIEW: 'inProgress',
  CLIENT_REVIEW: 'awaitingClient',
  CLIENT_COMMENTS: 'awaitingClient',
  REVISION: 'inProgress',
  CLIENT_APPROVED: 'done',
  COMPLETED: 'done',
};

export const STATUS_GROUP_COLOR_CLASS: Record<StatusGroup, string> = {
  draft: 'bg-line-strong',
  inProgress: 'bg-primary',
  awaitingClient: 'bg-warning',
  done: 'bg-success',
};

export function statusGroup(status: ProjectStatus): StatusGroup {
  return GROUP_BY_STATUS[status];
}

/**
 * Segments de la barre empilée « Projets / Par statut » — mutuellement exclusifs, contrairement
 * à `dashboardStats` dont certaines entrées (« en cours », « en attente ») se recouvrent
 * volontairement pour un affichage en chiffres isolés, mais casseraient les pourcentages d'une
 * barre empilée si on les y réutilisait telles quelles.
 */
export function statusSegments(projects: readonly { status: ProjectStatus }[], label: (group: StatusGroup) => string): StackedBarSegment[] {
  const counts: Record<StatusGroup, number> = { draft: 0, inProgress: 0, awaitingClient: 0, done: 0 };
  for (const project of projects) counts[statusGroup(project.status)] += 1;
  return STATUS_GROUPS.filter((group) => counts[group] > 0).map((group) => ({
    key: group,
    label: label(group),
    value: counts[group],
    colorClass: STATUS_GROUP_COLOR_CLASS[group],
  }));
}
