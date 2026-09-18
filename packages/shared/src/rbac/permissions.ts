import type { Role } from './roles';

/**
 * Matrice role -> permission, EN CODE et non en base (ADR 0004).
 *
 * Changer un droit exige un deploiement : c'est assume. En contrepartie, toute modification
 * passe par une revue de code et ne peut pas deriver silencieusement en production.
 */
export const PERMISSIONS = [
  // Comptes et organisations (EF-501, EF-502, EF-503)
  'user.read',
  'user.create',
  'user.update',
  'user.changeRole',
  'user.deactivate',
  'organization.read',
  'organization.manage',
  'clientCompany.read',
  'clientCompany.manage',

  // Projets (EF-504)
  'project.read',
  'project.create',
  'project.update',
  'project.assign',
  'project.transition',

  // Expression du besoin client (portail client, hors CDC — voir EF-507 propose)
  'request.create',
  'request.update',
  'request.submit',

  // Catalogue (EF-201, EF-505)
  'catalog.read',
  'catalog.manage',

  // Conception (EF-101 a EF-107)
  'architecture.read',
  'architecture.edit',

  // Dimensionnement (EF-202)
  'sizing.read',
  'sizing.edit',

  // Chiffrage (EF-302, EF-303)
  'bom.read',
  'cost.read',
  'cost.edit',

  // Collaboration (EF-403)
  'comment.create',

  // Tracabilite (ENF-07)
  'audit.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

/**
 * Une permission absente de la liste d'un role est refusee. Il n'existe pas d'heritage
 * implicite entre roles : chaque ligne est lisible seule.
 */
export const PERMISSION_MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: ALL,

  PROJECT_MANAGER: [
    'user.read',
    'organization.read',
    'clientCompany.read',
    'project.read',
    'project.create',
    'project.update',
    'project.assign',
    'project.transition',
    'catalog.read',
    'architecture.read',
    'sizing.read',
    'bom.read',
    'cost.read',
    'comment.create',
  ],

  ENGINEER: [
    'project.read',
    'project.transition',
    'catalog.read',
    'architecture.read',
    'sizing.read',
    'sizing.edit',
    'comment.create',
  ],

  ARCHITECT: [
    'project.read',
    'project.transition',
    'catalog.read',
    'architecture.read',
    'architecture.edit',
    'sizing.read',
    'comment.create',
  ],

  SALES: [
    'project.read',
    'project.transition',
    'catalog.read',
    'architecture.read',
    'bom.read',
    'cost.read',
    'cost.edit',
    'comment.create',
  ],

  // Le client lit, exprime son besoin et commente. Il ne modifie jamais la conception
  // technique validee.
  CLIENT: [
    'project.read',
    'project.transition',
    'request.create',
    'request.update',
    'request.submit',
    'architecture.read',
    'bom.read',
    'cost.read',
    'comment.create',
  ],
};

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}
