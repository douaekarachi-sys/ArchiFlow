import type { Role } from '../rbac/roles.js';

export const PROJECT_STATUSES = [
  'DRAFT',
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
  'CLIENT_APPROVED',
  'COMPLETED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectTransition {
  from: ProjectStatus;
  to: ProjectStatus;
  roles: readonly Role[];
  /**
   * Retour en arriere (ADR 0005). Impose un motif obligatoire et une entree d'audit.
   * Ce qui n'est pas dans cette table n'existe pas : aucun retour arbitraire.
   */
  reverse?: boolean;
  /** Roles projet qui doivent etre affectes pour que la transition soit possible. */
  requiredAssignments?: readonly Role[];
  /** Cle i18n du libelle de l'action (ENF-03 : aucune chaine en dur). */
  labelKey: string;
}

export const PROJECT_TRANSITIONS: readonly ProjectTransition[] = [
  { from: 'DRAFT', to: 'SUBMITTED', roles: ['CLIENT'], labelKey: 'workflow.submit' },
  { from: 'SUBMITTED', to: 'PENDING_ASSIGNMENT', roles: ['ADMIN'], labelKey: 'workflow.accept' },
  {
    from: 'PENDING_ASSIGNMENT',
    to: 'ASSIGNED',
    roles: ['ADMIN'],
    requiredAssignments: ['ENGINEER', 'ARCHITECT'],
    labelKey: 'workflow.confirmAssignments',
  },
  { from: 'ASSIGNED', to: 'ENGINEERING', roles: ['ENGINEER'], labelKey: 'workflow.startSizing' },
  {
    from: 'ENGINEERING',
    to: 'ARCHITECTURE',
    roles: ['ENGINEER', 'PROJECT_MANAGER'],
    labelKey: 'workflow.handToArchitect',
  },
  {
    from: 'ARCHITECTURE',
    to: 'INTERNAL_REVIEW',
    roles: ['ARCHITECT'],
    labelKey: 'workflow.submitInternalReview',
  },
  {
    from: 'INTERNAL_REVIEW',
    to: 'COMMERCIAL_REVIEW',
    roles: ['PROJECT_MANAGER'],
    labelKey: 'workflow.handToSales',
  },
  {
    from: 'INTERNAL_REVIEW',
    to: 'ARCHITECTURE',
    roles: ['PROJECT_MANAGER'],
    reverse: true,
    labelKey: 'workflow.sendBackToArchitect',
  },
  {
    from: 'COMMERCIAL_REVIEW',
    to: 'CLIENT_REVIEW',
    roles: ['SALES'],
    labelKey: 'workflow.publishProposal',
  },
  {
    from: 'CLIENT_REVIEW',
    to: 'CLIENT_COMMENTS',
    roles: ['CLIENT'],
    labelKey: 'workflow.requestChanges',
  },
  { from: 'CLIENT_REVIEW', to: 'CLIENT_APPROVED', roles: ['CLIENT'], labelKey: 'workflow.approve' },
  {
    from: 'CLIENT_COMMENTS',
    to: 'REVISION',
    roles: ['PROJECT_MANAGER'],
    reverse: true,
    labelKey: 'workflow.openRevision',
  },
  {
    from: 'REVISION',
    to: 'ARCHITECTURE',
    roles: ['ARCHITECT'],
    reverse: true,
    labelKey: 'workflow.resumeDesign',
  },
  // Depuis CLIENT_APPROVED, aucun retour : on cree une nouvelle version (ADR 0005).
  {
    from: 'CLIENT_APPROVED',
    to: 'COMPLETED',
    roles: ['PROJECT_MANAGER', 'ADMIN'],
    labelKey: 'workflow.close',
  },
];

export const TRANSITION_REFUSALS = [
  'UNKNOWN_TRANSITION',
  'ROLE_NOT_ALLOWED',
  'MISSING_ASSIGNMENTS',
  'REASON_REQUIRED',
] as const;
export type TransitionRefusal = (typeof TRANSITION_REFUSALS)[number];

export interface TransitionRequest {
  from: ProjectStatus;
  to: ProjectStatus;
  role: Role;
  /** Motif saisi par l'utilisateur ; obligatoire pour un retour en arriere. */
  reason?: string;
  /** Roles projet actuellement affectes (ProjectAssignment). */
  assignedRoles?: readonly Role[];
}

export type TransitionCheck =
  | { allowed: true; transition: ProjectTransition }
  | { allowed: false; refusal: TransitionRefusal; detail: string };

export function findTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): ProjectTransition | undefined {
  return PROJECT_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/**
 * Seul point de verite des transitions. Aucun service n'ecrit project.status directement :
 * le backend appelle canTransition() dans applyTransition(), le frontend l'appelle pour
 * proposer les actions — confort d'affichage, jamais une autorite.
 */
export function canTransition(request: TransitionRequest): TransitionCheck {
  const { from, to, role, reason, assignedRoles = [] } = request;
  const transition = findTransition(from, to);

  if (!transition) {
    return { allowed: false, refusal: 'UNKNOWN_TRANSITION', detail: `${from} -> ${to}` };
  }
  if (!transition.roles.includes(role)) {
    return { allowed: false, refusal: 'ROLE_NOT_ALLOWED', detail: `${role} sur ${from} -> ${to}` };
  }
  const missing = (transition.requiredAssignments ?? []).filter((r) => !assignedRoles.includes(r));
  if (missing.length > 0) {
    return { allowed: false, refusal: 'MISSING_ASSIGNMENTS', detail: missing.join(', ') };
  }
  if (transition.reverse === true && (reason === undefined || reason.trim() === '')) {
    return { allowed: false, refusal: 'REASON_REQUIRED', detail: `${from} -> ${to}` };
  }
  return { allowed: true, transition };
}

/** Transitions proposables a l'utilisateur depuis l'etat courant, selon son role. */
export function availableTransitions(
  from: ProjectStatus,
  role: Role,
): readonly ProjectTransition[] {
  return PROJECT_TRANSITIONS.filter((t) => t.from === from && t.roles.includes(role));
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && (PROJECT_STATUSES as readonly string[]).includes(value);
}
