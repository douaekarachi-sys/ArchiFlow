import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthContext, Permission } from '@archiflow/shared';
import type { AuthenticatedRequest } from '../auth-context';

export const IS_PUBLIC = 'archiflow:public';
export const ALLOW_PENDING_PASSWORD = 'archiflow:allow-pending-password';
export const REQUIRED_PERMISSION = 'archiflow:permission';

/** Route accessible sans authentification (connexion, rafraîchissement, santé). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Route accessible avant le changement du mot de passe provisoire (ADR 0010). */
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PENDING_PASSWORD, true);

/** verifierPermissions du diagramme de séquence, appliqué avant le contrôleur. */
export const RequirePermission = (permission: Permission) => SetMetadata(REQUIRED_PERMISSION, permission);

/** Contexte d'authentification construit côté serveur, jamais depuis le corps de la requête. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.auth) throw new Error('CurrentUser utilisé sur une route publique');
  return req.auth;
});
