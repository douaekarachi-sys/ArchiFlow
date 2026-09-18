/**
 * Les six roles de l'application.
 *
 * Le CDC (EF-503) n'en prevoit que trois — administrateur, concepteur, invite. L'ecart est
 * assume et documente dans docs/TRACABILITE.md : le diagramme de cas d'utilisation distingue
 * cinq acteurs metier, que trois roles ne permettent pas de representer.
 */
export const ROLES = [
  'ADMIN',
  'PROJECT_MANAGER',
  'ENGINEER',
  'ARCHITECT',
  'SALES',
  'CLIENT',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles internes a l'entreprise d'integration : tout sauf le client final. */
export const INTERNAL_ROLES: readonly Role[] = [
  'ADMIN',
  'PROJECT_MANAGER',
  'ENGINEER',
  'ARCHITECT',
  'SALES',
];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isInternalRole(role: Role): boolean {
  return INTERNAL_ROLES.includes(role);
}

/** Portail vers lequel rediriger apres authentification (EF-502 / diagramme de sequence). */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  PROJECT_MANAGER: '/pm',
  ENGINEER: '/engineer',
  ARCHITECT: '/architect',
  SALES: '/sales',
  CLIENT: '/client',
};
