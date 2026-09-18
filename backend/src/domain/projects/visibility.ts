import type { Role } from '@archiflow/shared';

/**
 * Qui voit quels projets (ADR 0006 + affectations, ARCHITECTURE-CIBLE §6.5) :
 *
 * - ORGANIZATION   : tous les projets du locataire ;
 * - ASSIGNED       : uniquement les projets où l'utilisateur est affecté ;
 * - CLIENT_COMPANY : uniquement les projets de sa société cliente.
 *
 * « Le rôle global ouvre une porte, l'affectation ouvre la pièce. »
 */
export type ProjectVisibility = 'ORGANIZATION' | 'ASSIGNED' | 'CLIENT_COMPANY';

export const PROJECT_VISIBILITY: Record<Role, ProjectVisibility> = {
  ADMIN: 'ORGANIZATION',
  PROJECT_MANAGER: 'ASSIGNED',
  ENGINEER: 'ASSIGNED',
  ARCHITECT: 'ASSIGNED',
  SALES: 'ASSIGNED',
  CLIENT: 'CLIENT_COMPANY',
};

/**
 * Pour agir sur un projet (transition de statut), un rôle interne autre qu'ADMIN doit y être
 * affecté AVEC CE RÔLE : un architecte affecté en tant qu'architecte ne peut pas faire le pas
 * réservé à l'ingénieur, même s'il possède les deux casquettes ailleurs.
 */
export function requiresAssignmentAs(role: Role): boolean {
  return PROJECT_VISIBILITY[role] === 'ASSIGNED';
}

/** Une affectation n'a de sens que pour un rôle interne affectable. */
export const ASSIGNABLE_ROLES: readonly Role[] = ['PROJECT_MANAGER', 'ENGINEER', 'ARCHITECT', 'SALES'];
