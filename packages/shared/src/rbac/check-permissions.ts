import { PERMISSION_MATRIX, type Permission } from './permissions.js';
import { isInternalRole, type Role } from './roles.js';

/**
 * Contexte d'authentification, construit COTE SERVEUR a partir du token verifie.
 * Le role envoye par le frontend n'est jamais une source de verite.
 */
export interface AuthContext {
  userId: string;
  role: Role;
  organizationId: string;
  /** Renseigne uniquement pour un utilisateur CLIENT (ADR 0006). */
  clientCompanyId?: string | null;
}

/** Ressource visee, pour les verifications de portee (ADR 0006). */
export interface ResourceRef {
  organizationId?: string | null;
  clientCompanyId?: string | null;
}

export interface PermissionResult {
  allowed: boolean;
  /** Motif du refus, destine aux logs et aux tests — jamais affiche tel quel a l'utilisateur. */
  reason?: string;
}

const ALLOWED: PermissionResult = { allowed: true };

/**
 * Nom aligne sur le diagramme de sequence « API gestion des comptes »
 * (verifierPermissions -> checkPermissions).
 */
export function checkPermissions(
  ctx: AuthContext,
  permission: Permission,
  resource?: ResourceRef,
): PermissionResult {
  if (!hasPermission(ctx.role, permission)) {
    return { allowed: false, reason: `role ${ctx.role} sans permission ${permission}` };
  }

  if (!resource) return ALLOWED;

  // Niveau 1 — locataire. S'applique a tout le monde, sans exception.
  if (
    resource.organizationId != null &&
    resource.organizationId !== ctx.organizationId
  ) {
    return { allowed: false, reason: 'ressource hors du locataire' };
  }

  // Niveau 2 — societe cliente. N'a d'effet que pour le role CLIENT ; transparent pour les
  // roles internes, qui voient tous les projets de leur locataire.
  if (!isInternalRole(ctx.role)) {
    if (!ctx.clientCompanyId) {
      return { allowed: false, reason: 'utilisateur client sans societe rattachee' };
    }
    if (
      resource.clientCompanyId != null &&
      resource.clientCompanyId !== ctx.clientCompanyId
    ) {
      return { allowed: false, reason: 'ressource hors de la societe cliente' };
    }
  }

  return ALLOWED;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role].includes(permission);
}

/** Utilise par le frontend pour griser les boutons. Confort d'affichage, jamais une autorite. */
export function permissionsOf(role: Role): readonly Permission[] {
  return PERMISSION_MATRIX[role];
}
