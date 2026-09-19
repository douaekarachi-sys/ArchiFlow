import type { ProjectStatus, Role } from '@archiflow/shared';

export type StatTone = 'neutral' | 'primary' | 'success' | 'warning' | 'info';

export interface Stat {
  /** Clé i18n sous dashboard.stats. */
  key: string;
  value: number;
  tone: StatTone;
}

const IN_PROGRESS: readonly ProjectStatus[] = [
  'SUBMITTED',
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'ENGINEERING',
  'ARCHITECTURE',
  'INTERNAL_REVIEW',
  'COMMERCIAL_REVIEW',
  'CLIENT_REVIEW',
  'CLIENT_COMMENTS',
  'REVISION',
];

const count = (projects: readonly { status: ProjectStatus }[], statuses: readonly ProjectStatus[]) =>
  projects.filter((p) => statuses.includes(p.status)).length;

/**
 * Indicateurs du tableau de bord de chaque portail, calculés sur les projets VISIBLES par
 * l'utilisateur (le serveur a déjà appliqué la portée). Fonction pure, testée.
 */
export function dashboardStats(
  role: Role,
  projects: readonly { status: ProjectStatus }[],
  extras: { activeUsers?: number } = {},
): Stat[] {
  const total: Stat = { key: 'total', value: projects.length, tone: 'neutral' };
  const completed: Stat = { key: 'completed', value: count(projects, ['COMPLETED']), tone: 'success' };
  const awaitingClient: Stat = {
    key: 'awaitingClient',
    value: count(projects, ['CLIENT_REVIEW', 'CLIENT_COMMENTS']),
    tone: 'info',
  };

  switch (role) {
    case 'ADMIN':
      return [
        total,
        { key: 'inProgress', value: count(projects, IN_PROGRESS), tone: 'primary' },
        { key: 'pending', value: count(projects, ['SUBMITTED', 'PENDING_ASSIGNMENT']), tone: 'warning' },
        completed,
        ...(extras.activeUsers === undefined
          ? []
          : [{ key: 'activeUsers', value: extras.activeUsers, tone: 'neutral' } satisfies Stat]),
      ];
    case 'PROJECT_MANAGER':
      return [
        total,
        { key: 'internalReview', value: count(projects, ['INTERNAL_REVIEW']), tone: 'warning' },
        awaitingClient,
        completed,
      ];
    case 'ENGINEER':
      return [total, { key: 'toProcess', value: count(projects, ['ASSIGNED', 'ENGINEERING']), tone: 'primary' }, completed];
    case 'ARCHITECT':
      return [
        total,
        { key: 'toDesign', value: count(projects, ['ARCHITECTURE', 'REVISION']), tone: 'primary' },
        { key: 'internalReview', value: count(projects, ['INTERNAL_REVIEW']), tone: 'warning' },
      ];
    case 'SALES':
      return [total, { key: 'toQuote', value: count(projects, ['COMMERCIAL_REVIEW']), tone: 'primary' }, awaitingClient];
    case 'CLIENT':
      return [
        total,
        { key: 'awaitingMyDecision', value: count(projects, ['CLIENT_REVIEW']), tone: 'warning' },
        { key: 'inProgress', value: count(projects, IN_PROGRESS), tone: 'primary' },
        { key: 'approved', value: count(projects, ['CLIENT_APPROVED', 'COMPLETED']), tone: 'success' },
      ];
  }
}
