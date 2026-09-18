import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AccessTokenService } from '../tokens/access-token.service';
import type { AuthenticatedRequest } from '../auth-context';
import { ALLOW_PENDING_PASSWORD, IS_PUBLIC } from '../decorators';

/**
 * Première garde, globale. Le jeton prouve l'identité ; l'état du compte, le rôle et le
 * rattachement sont RELUS EN BASE. Le rôle envoyé par le frontend n'est jamais lu.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token ? await this.tokens.verify(token) : null;
    if (!payload) throw new AppError('UNAUTHENTICATED', 'Authentification requise');

    const user = await this.prisma.system.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        organizationId: true,
        clientCompanyId: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        deletedAt: true,
        anonymizedAt: true,
      },
    });
    if (!user || user.deletedAt || user.anonymizedAt) {
      throw new AppError('UNAUTHENTICATED', 'Authentification requise');
    }
    // Un jeton émis avant un changement de mot de passe ne vaut plus rien.
    const issuedAt = (payload as { iat?: number }).iat ?? 0;
    if (user.passwordChangedAt && issuedAt * 1000 < user.passwordChangedAt.getTime() - 1000) {
      throw new AppError('SESSION_EXPIRED', 'Session expirée');
    }

    req.auth = {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
      clientCompanyId: user.clientCompanyId,
    };

    if (user.mustChangePassword && !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD, targets)) {
      throw new AppError('PASSWORD_CHANGE_REQUIRED', 'Changement du mot de passe provisoire requis');
    }
    return true;
  }
}
