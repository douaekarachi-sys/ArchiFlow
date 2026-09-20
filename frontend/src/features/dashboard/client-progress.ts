import type { ProjectStatus } from '@archiflow/shared';

/**
 * Progression vue par le client — jamais les statuts internes du workflow (13 valeurs, langage
 * d'équipe). Quatre étapes, celles déjà utilisées par le panneau client (`dashboard.clientSteps`).
 */
export const CLIENT_STAGES = ['request', 'analysis', 'design', 'validation'] as const;
export type ClientStage = (typeof CLIENT_STAGES)[number];

const STAGE_BY_STATUS: Record<ProjectStatus, ClientStage> = {
  DRAFT: 'request',
  SUBMITTED: 'request',
  PENDING_ASSIGNMENT: 'analysis',
  ASSIGNED: 'analysis',
  ENGINEERING: 'analysis',
  ARCHITECTURE: 'design',
  INTERNAL_REVIEW: 'design',
  COMMERCIAL_REVIEW: 'design',
  CLIENT_REVIEW: 'validation',
  CLIENT_COMMENTS: 'validation',
  REVISION: 'validation',
  CLIENT_APPROVED: 'validation',
  COMPLETED: 'validation',
};

export function clientStage(status: ProjectStatus): ClientStage {
  return STAGE_BY_STATUS[status];
}

export function clientStageIndex(status: ProjectStatus): number {
  return CLIENT_STAGES.indexOf(clientStage(status));
}
