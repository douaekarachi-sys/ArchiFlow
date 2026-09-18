import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, mergeMap, type Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../../security/auth-context';
import { AuditService } from './audit.service';

export const AUDITED = 'archiflow:audited';

export interface AuditedOptions {
  action: string;
  targetType: string;
  /** Paramètre de route portant l'identifiant de la cible. */
  targetParam?: string;
  /** Vrai si la cible est un projet : alimente AuditLog.projectId. */
  isProject?: boolean;
}

/**
 * @Audited({ action: 'project.assign', targetType: 'project', targetParam: 'id', isProject: true })
 * L'entrée est écrite APRÈS le succès du contrôleur. Pas d'appel manuel dispersé.
 */
export const Audited = (options: AuditedOptions) => SetMetadata(AUDITED, options);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditedOptions | undefined>(AUDITED, context.getHandler());
    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const fromParam = options.targetParam ? String(req.params[options.targetParam] ?? '') || null : null;

    return next.handle().pipe(
      mergeMap((result: unknown) => {
        // Sans paramètre de route (création), la cible est la ressource renvoyée.
        const created = (result as { id?: unknown } | null)?.id;
        const targetId = fromParam ?? (typeof created === 'string' ? created : null);
        return from(
          this.audit
            .record(req.auth ?? null, {
              action: options.action,
              targetType: options.targetType,
              targetId,
              projectId: options.isProject ? targetId : null,
            })
            .then(() => result),
        );
      }),
    );
  }
}
