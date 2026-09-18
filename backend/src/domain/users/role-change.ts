import { isInternalRole, type Role } from '@archiflow/shared';

export type RoleChangeRefusal = 'SELF_CHANGE' | 'CROSS_FAMILY' | 'UNCHANGED';

/**
 * Règles métier de mettreAJourRole, en plus de la permission `user.changeRole` :
 *
 * - un administrateur ne modifie pas son propre rôle (il pourrait se retirer le dernier accès
 *   d'administration du locataire) ;
 * - un compte ne passe pas de « client » à « interne » ni l'inverse : ce ne sont pas les mêmes
 *   personnes, pas le même rattachement (société cliente), pas le même portail. On crée un autre
 *   compte.
 */
export function checkRoleChange(input: {
  actorId: string;
  targetId: string;
  currentRole: Role;
  newRole: Role;
}): RoleChangeRefusal | null {
  if (input.actorId === input.targetId) return 'SELF_CHANGE';
  if (input.currentRole === input.newRole) return 'UNCHANGED';
  if (isInternalRole(input.currentRole) !== isInternalRole(input.newRole)) return 'CROSS_FAMILY';
  return null;
}
