import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { checkPermissions, type Permission } from '@archiflow/shared';
import { forbidden } from '../../common/errors/app-error';
import type { AuthenticatedRequest } from '../auth-context';
import { REQUIRED_PERMISSION } from '../decorators';

/**
 * Deuxième garde, globale : applique la matrice rôle → permission (ADR 0004) déclarée par
 * @RequirePermission. La portée sur une ressource précise (locataire, société cliente,
 * affectation) est vérifiée ensuite par le service qui charge cette ressource.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;

    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!auth || !checkPermissions(auth, permission).allowed) throw forbidden();
    return true;
  }
}
