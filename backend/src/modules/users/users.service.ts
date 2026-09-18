import { Injectable } from '@nestjs/common';
import {
  isInternalRole,
  type AuthContext,
  type CreateUserAccepted,
  type CreateUserInput,
  type Role,
} from '@archiflow/shared';
import { AppError, notFound } from '../../common/errors/app-error';
import { skipTake, toPage, type Page, type Pagination } from '../../common/http/pagination';
import { PrismaService } from '../../core/prisma/prisma.service';
import { anonymizedIdentity } from '../../domain/users/anonymize';
import { checkRoleChange } from '../../domain/users/role-change';
import { Prisma } from '../../generated/prisma/client';
import { PasswordHasher } from '../../security/hashing/password-hasher';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';

/** Champs exposés : jamais le hash, jamais les jetons. */
const PUBLIC_USER = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  clientCompanyId: true,
  mustChangePassword: true,
  lastLoginAt: true,
  deletedAt: true,
  anonymizedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER }>;

const ACCEPTED: CreateUserAccepted = { status: 'accepted' };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  async list(
    ctx: AuthContext,
    filter: { role?: Role; q?: string; includeInactive?: boolean },
    pagination: Pagination,
  ): Promise<Page<PublicUser>> {
    const where: Prisma.UserWhereInput = {
      organizationId: ctx.organizationId,
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.includeInactive ? {} : { deletedAt: null }),
      ...(filter.q
        ? {
            OR: [
              { email: { contains: filter.q, mode: 'insensitive' } },
              { lastName: { contains: filter.q, mode: 'insensitive' } },
              { firstName: { contains: filter.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.tenant.user.findMany({
        where,
        select: PUBLIC_USER,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        ...skipTake(pagination),
      }),
      this.prisma.tenant.user.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  // --- Création — diagramme « API gestion des comptes », scénario 1 (ADR 0010) ---------------

  async create(ctx: AuthContext, input: CreateUserInput): Promise<CreateUserAccepted> {
    // Hachage AVANT la vérification d'existence : les deux branches coûtent le même temps.
    const passwordHash = await this.hasher.hash(input.temporaryPassword);

    if (input.clientCompanyId) {
      const company = await this.prisma.tenant.clientCompany.findFirst({
        where: { id: input.clientCompanyId, organizationId: ctx.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!company) throw notFound('Société cliente');
    }

    if (await this.verifyExistingEmail(input.email)) {
      await this.recordCollision(ctx);
      return ACCEPTED;
    }

    try {
      const user = await this.prisma.tenant.user.create({
        data: {
          organizationId: ctx.organizationId,
          clientCompanyId: isInternalRole(input.role) ? null : (input.clientCompanyId ?? null),
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash,
          role: input.role,
          mustChangePassword: true,
        },
        select: { id: true },
      });
      await this.audit.record(ctx, {
        action: 'user.create',
        targetType: 'user',
        targetId: user.id,
        details: { role: input.role },
      });
    } catch (error) {
      // Course entre deux créations simultanées : même traitement qu'une collision.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.recordCollision(ctx);
      } else {
        throw error;
      }
    }
    return ACCEPTED;
  }

  /** verifierEmailExistant(email) — sur toute la plateforme, l'unicité étant globale. */
  private async verifyExistingEmail(email: string): Promise<boolean> {
    const existing = await this.prisma.system.user.findUnique({ where: { email }, select: { id: true } });
    return existing !== null;
  }

  /** Aucun compte créé, aucune adresse journalisée : on trace le fait, pas la donnée. */
  private recordCollision(ctx: AuthContext): Promise<void> {
    return this.audit.record(ctx, { action: 'user.create.email_unavailable', targetType: 'user' });
  }

  // --- Changement de rôle — scénario 3 ------------------------------------------------------

  async changeRole(ctx: AuthContext, userId: string, newRole: Role): Promise<PublicUser> {
    const target = await this.findInOrganization(ctx, userId);
    const refusal = checkRoleChange({
      actorId: ctx.userId,
      targetId: target.id,
      currentRole: target.role,
      newRole,
    });
    if (refusal === 'UNCHANGED') return target;
    if (refusal === 'SELF_CHANGE') throw new AppError('CONFLICT', 'Vous ne pouvez pas modifier votre propre rôle');
    if (refusal === 'CROSS_FAMILY') {
      throw new AppError('UNPROCESSABLE', 'Un compte client ne peut pas devenir interne, ni l’inverse');
    }

    const updated = await this.prisma.tenant.user.update({
      where: { id: target.id, organizationId: ctx.organizationId },
      data: { role: newRole },
      select: PUBLIC_USER,
    });
    await this.audit.record(ctx, {
      action: 'user.role.changed',
      targetType: 'user',
      targetId: target.id,
      details: { from: target.role, to: newRole },
    });
    return updated;
  }

  // --- Cycle de vie (ENF-02) ----------------------------------------------------------------

  async deactivate(ctx: AuthContext, userId: string): Promise<PublicUser> {
    const target = await this.findInOrganization(ctx, userId);
    this.refuseSelf(ctx, target.id);
    const updated = await this.prisma.tenant.user.update({
      where: { id: target.id, organizationId: ctx.organizationId },
      data: { deletedAt: target.deletedAt ?? new Date() },
      select: PUBLIC_USER,
    });
    await this.auth.revokeAllSessions(target.id);
    await this.audit.record(ctx, { action: 'user.deactivated', targetType: 'user', targetId: target.id });
    return updated;
  }

  async reactivate(ctx: AuthContext, userId: string): Promise<PublicUser> {
    const target = await this.findInOrganization(ctx, userId);
    if (target.anonymizedAt) throw new AppError('UNPROCESSABLE', 'Un compte anonymisé ne peut pas être réactivé');
    const updated = await this.prisma.tenant.user.update({
      where: { id: target.id, organizationId: ctx.organizationId },
      data: { deletedAt: null },
      select: PUBLIC_USER,
    });
    await this.audit.record(ctx, { action: 'user.reactivated', targetType: 'user', targetId: target.id });
    return updated;
  }

  /** Effacement d'identité, irréversible : l'identifiant et l'historique sont conservés. */
  async anonymize(ctx: AuthContext, userId: string): Promise<PublicUser> {
    const target = await this.findInOrganization(ctx, userId);
    this.refuseSelf(ctx, target.id);
    if (target.anonymizedAt) return target;

    const updated = await this.prisma.system.$transaction(async (tx) => {
      await tx.clientProfile.updateMany({
        where: { userId: target.id },
        data: { phone: null, jobTitle: null, deletedAt: new Date() },
      });
      return tx.user.update({
        where: { id: target.id },
        data: anonymizedIdentity(target.id, new Date()),
        select: PUBLIC_USER,
      });
    });
    await this.auth.revokeAllSessions(target.id);
    await this.audit.record(ctx, { action: 'user.anonymized', targetType: 'user', targetId: target.id });
    return updated;
  }

  private async findInOrganization(ctx: AuthContext, userId: string): Promise<PublicUser> {
    const user = await this.prisma.tenant.user.findFirst({
      where: { id: userId, organizationId: ctx.organizationId },
      select: PUBLIC_USER,
    });
    if (!user) throw notFound('Utilisateur');
    return user;
  }

  private refuseSelf(ctx: AuthContext, targetId: string): void {
    if (ctx.userId === targetId) throw new AppError('CONFLICT', 'Action impossible sur votre propre compte');
  }
}
