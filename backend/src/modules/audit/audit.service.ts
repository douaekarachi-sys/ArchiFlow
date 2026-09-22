import { Injectable } from '@nestjs/common';
import type { AuthContext } from '@archiflow/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { skipTake, toPage, type Page, type Pagination } from '../../common/http/pagination';

export interface AuditEntry {
  action: string;
  targetType: string;
  targetId?: string | null;
  projectId?: string | null;
  /** Jamais de mot de passe, de jeton, ni de corps de requête d'authentification. */
  details?: Prisma.InputJsonValue;
}

/** Tout client capable d'écrire une entrée : client système ou transaction en cours. */
interface AuditWriter {
  auditLog: { create(args: { data: Prisma.AuditLogUncheckedCreateInput }): PromiseLike<unknown> };
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Journalise une action. `db` permet d'écrire dans la transaction de l'action elle-même :
   * une action annulée ne laisse pas d'entrée d'audit mensongère.
   */
  async record(
    actor: Pick<AuthContext, 'userId' | 'organizationId'> | null,
    entry: AuditEntry,
    db: AuditWriter = this.prisma.system,
  ): Promise<void> {
    await db.auditLog.create({
      data: {
        organizationId: actor?.organizationId ?? null,
        actorId: actor?.userId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        projectId: entry.projectId ?? null,
        details: entry.details,
      },
    });
  }

  async list(
    ctx: AuthContext,
    filter: { action?: string; projectId?: string },
    pagination: Pagination,
  ): Promise<Page<unknown>> {
    const where: Prisma.AuditLogWhereInput = {
      organizationId: ctx.organizationId,
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.system.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...skipTake(pagination) }),
      this.prisma.system.auditLog.count({ where }),
    ]);

    // Résolution du nom de l'auteur — un journal d'audit illisible (UUID nus) n'est pas présentable.
    const actorIds = [...new Set(data.map((entry) => entry.actorId).filter((id): id is string => id != null))];
    const actors = actorIds.length
      ? await this.prisma.system.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const actorById = new Map(actors.map((a) => [a.id, a]));
    const enriched = data.map((entry) => ({ ...entry, actor: entry.actorId ? (actorById.get(entry.actorId) ?? null) : null }));

    return toPage(enriched, total, pagination);
  }
}
