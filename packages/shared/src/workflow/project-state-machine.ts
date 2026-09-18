import type { Role } from '../rbac/roles';

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
  /** Libelle de l'action tel qu'affiche a l'utilisateur. */
  label: string;
}

export const PROJECT_TRANSITIONS: readonly ProjectTransition[] = [
  { from: 'DRAFT', to: 'SUBMITTED', roles: ['CLIENT'], label: 'Soumettre la demande' },
  { from: 'SUBMITTED', to: 'PENDING_ASSIGNMENT', roles: ['ADMIN'], label: 'Valider la demande' },
  {
    from: 'PENDING_ASSIGNMENT',
    to: 'ASSIGNED',
    roles: ['ADMIN'],
    label: "Confirmer les affectations",
  },
  { from: 'ASSIGNED', to: 'ENGINEERING', roles: ['ENGINEER'], label: 'Demarrer le dimensionnement' },
  {
    from: 'ENGINEERING',
    to: 'ARCHITECTURE',
    roles: ['ENGINEER', 'PROJECT_MANAGER'],
    label: 'Transmettre a la conception',
  },
  {
    from: 'ARCHITECTURE',
    to: 'INTERNAL_REVIEW',
    roles: ['ARCHITECT'],
    label: 'Soumettre a la revue interne',
  },
  {
    from: 'INTERNAL_REVIEW',
    to: 'COMMERCIAL_REVIEW',
    roles: ['PROJECT_MANAGER'],
    label: 'Transmettre au commercial',
  },
  {
    from: 'INTERNAL_REVIEW',
    to: 'ARCHITECTURE',
    roles: ['PROJECT_MANAGER'],
    reverse: true,
    label: "Renvoyer a l'architecte",
  },
  {
    from: 'COMMERCIAL_REVIEW',
    to: 'CLIENT_REVIEW',
    roles: ['SALES'],
    label: 'Publier la proposition client',
  },
  {
    from: 'CLIENT_REVIEW',
    to: 'CLIENT_COMMENTS',
    roles: ['CLIENT'],
    label: 'Demander une modification',
  },
  { from: 'CLIENT_REVIEW', to: 'CLIENT_APPROVED', roles: ['CLIENT'], label: "Valider l'architecture" },
  {
    from: 'CLIENT_COMMENTS',
    to: 'REVISION',
    roles: ['PROJECT_MANAGER'],
    reverse: true,
    label: 'Ouvrir une revision',
  },
  {
    from: 'REVISION',
    to: 'ARCHITECTURE',
    roles: ['ARCHITECT'],
    reverse: true,
    label: 'Reprendre la conception',
  },
  // Depuis CLIENT_APPROVED, aucun retour : on cree une nouvelle version (ADR 0005).
  {
    from: 'CLIENT_APPROVED',
    to: 'COMPLETED',
    roles: ['PROJECT_MANAGER', 'ADMIN'],
    label: 'Cloturer le projet',
  },
];

export interface TransitionCheck {
  allowed: boolean;
  /** Vrai pour un retour en arriere : applyTransition refusera sans motif. */
  requiresReason: boolean;
  reason?: string;
}

export function findTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): ProjectTransition | undefined {
  return PROJECT_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/**
 * Seul point de verite des transitions. Aucun service n'ecrit project.status directement.
 */
export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  role: Role,
  reason?: string,
): TransitionCheck {
  const transition = findTransition(from, to);

  if (!transition) {
    return {
      allowed: false,
      requiresReason: false,
      reason: `transition ${from} -> ${to} inexistante`,
    };
  }

  if (!transition.roles.includes(role)) {
    return {
      allowed: false,
      requiresReason: transition.reverse === true,
      reason: `role ${role} non autorise sur ${from} -> ${to}`,
    };
  }

  if (transition.reverse === true && (reason === undefined || reason.trim() === '')) {
    return {
      allowed: false,
      requiresReason: true,
      reason: 'motif obligatoire pour un retour en arriere',
    };
  }

  return { allowed: true, requiresReason: transition.reverse === true };
}

/** Transitions proposables a l'utilisateur depuis l'etat courant. */
export function availableTransitions(
  from: ProjectStatus,
  role: Role,
): readonly ProjectTransition[] {
  return PROJECT_TRANSITIONS.filter((t) => t.from === from && t.roles.includes(role));
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && (PROJECT_STATUSES as readonly string[]).includes(value);
}
