import { Injectable } from '@nestjs/common';
import {
  availableTransitions,
  canTransition,
  type AuthContext,
  type CreateAssignmentInput,
  type CreateProjectInput,
  type ProjectStatus,
  type Role,
  type TransitionRefusal,
  type TransitionRequestInput,
} from '@archiflow/shared';
import { AppError, forbidden, notFound } from '../../common/errors/app-error';
import { skipTake, toPage, type Pagination } from '../../common/http/pagination';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ASSIGNABLE_ROLES, PROJECT_VISIBILITY, requiresAssignmentAs } from '../../domain/projects/visibility';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';

const PROJECT_SUMMARY = {
  id: true,
  name: true,
  description: true,
  status: true,
  clientCompanyId: true,
  clientCompany: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

const ASSIGNMENT_VIEW = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, firstName: true, lastName: true, role: true } },
} satisfies Prisma.ProjectAssignmentSelect;

const REFUSAL_MESSAGES: Record<TransitionRefusal, string> = {
  UNKNOWN_TRANSITION: 'Cette transition n’existe pas depuis le statut actuel',
  ROLE_NOT_ALLOWED: 'Permissions insuffisantes',
  MISSING_ASSIGNMENTS: 'Affectations incomplètes pour cette étape',
  REASON_REQUIRED: 'Un motif est obligatoire pour un retour en arrière',
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Portée de lecture : locataire (toujours), puis société cliente ou affectation selon le rôle.
   * Un projet hors portée est INTROUVABLE (404), jamais « interdit » (ADR 0006).
   */
  scope(ctx: AuthContext): Prisma.ProjectWhereInput {
    const base = { organizationId: ctx.organizationId };
    switch (PROJECT_VISIBILITY[ctx.role]) {
      case 'ORGANIZATION':
        return base;
      case 'ASSIGNED':
        return { ...base, assignments: { some: { userId: ctx.userId } } };
      case 'CLIENT_COMPANY':
        // Un CLIENT sans société ne voit rien (checkPermissions le refuse aussi).
        return { ...base, clientCompanyId: ctx.clientCompanyId ?? '00000000-0000-0000-0000-000000000000' };
    }
  }

  async list(ctx: AuthContext, filter: { status?: ProjectStatus; q?: string }, pagination: Pagination) {
    const where: Prisma.ProjectWhereInput = {
      AND: [
        this.scope(ctx),
        filter.status ? { status: filter.status } : {},
        filter.q ? { name: { contains: filter.q, mode: 'insensitive' } } : {},
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.tenant.project.findMany({
        where,
        select: PROJECT_SUMMARY,
        orderBy: { updatedAt: 'desc' },
        ...skipTake(pagination),
      }),
      this.prisma.tenant.project.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  async get(ctx: AuthContext, projectId: string) {
    const project = await this.prisma.tenant.project.findFirst({
      where: { AND: [{ id: projectId }, this.scope(ctx)] },
      select: { ...PROJECT_SUMMARY, assignments: { select: ASSIGNMENT_VIEW } },
    });
    if (!project) throw notFound('Projet');
    return project;
  }

  async create(ctx: AuthContext, input: CreateProjectInput) {
    const company = await this.prisma.tenant.clientCompany.findFirst({
      where: { id: input.clientCompanyId, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!company) throw notFound('Société cliente');

    return this.prisma.tenant.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: ctx.organizationId,
          clientCompanyId: company.id,
          name: input.name,
          description: input.description,
          createdById: ctx.userId,
        },
        select: PROJECT_SUMMARY,
      });
      // Un chef de projet qui crée un projet en devient le responsable, sans quoi il ne le verrait pas.
      if (requiresAssignmentAs(ctx.role)) {
        await tx.projectAssignment.create({
          data: {
            organizationId: ctx.organizationId,
            projectId: project.id,
            userId: ctx.userId,
            role: ctx.role,
            assignedById: ctx.userId,
          },
        });
      }
      await this.audit.record(
        ctx,
        { action: 'project.create', targetType: 'project', targetId: project.id, projectId: project.id },
        tx,
      );
      return project;
    });
  }

  // --- Machine à états : seul point d'écriture de Project.status (ADR 0005) -----------------

  async applyTransition(ctx: AuthContext, projectId: string, input: TransitionRequestInput) {
    const project = await this.get(ctx, projectId);
    const assignedRoles = this.assertCanAct(ctx, project.assignments);

    const check = canTransition({
      from: project.status,
      to: input.to,
      role: ctx.role,
      reason: input.reason,
      assignedRoles,
    });
    if (!check.allowed) {
      if (check.refusal === 'ROLE_NOT_ALLOWED') throw forbidden();
      throw new AppError('TRANSITION_REFUSED', REFUSAL_MESSAGES[check.refusal], {
        refusal: check.refusal,
        detail: check.detail,
      });
    }
    const reason = check.transition.reverse ? input.reason?.trim() : undefined;

    return this.prisma.tenant.$transaction(async (tx) => {
      // Mise à jour conditionnée au statut lu : deux transitions concurrentes ne passent pas toutes deux.
      const updated = await tx.project.updateMany({
        where: { id: project.id, organizationId: ctx.organizationId, status: project.status },
        data: { status: input.to },
      });
      if (updated.count === 0) throw new AppError('CONFLICT', 'Le statut du projet a changé entre-temps');

      await tx.projectStatusHistory.create({
        data: {
          organizationId: ctx.organizationId,
          projectId: project.id,
          fromStatus: project.status,
          toStatus: input.to,
          actorId: ctx.userId,
          reason,
        },
      });
      await this.audit.record(
        ctx,
        {
          action: check.transition.reverse ? 'project.transition.reverse' : 'project.transition',
          targetType: 'project',
          targetId: project.id,
          projectId: project.id,
          details: { from: project.status, to: input.to, ...(reason ? { reason } : {}) },
        },
        tx,
      );
      return { id: project.id, status: input.to };
    });
  }

  async available(ctx: AuthContext, projectId: string) {
    const project = await this.get(ctx, projectId);
    const mayAct =
      !requiresAssignmentAs(ctx.role) ||
      project.assignments.some((a) => a.user.id === ctx.userId && a.role === ctx.role);
    if (!mayAct) return [];
    return availableTransitions(project.status, ctx.role).map((t) => ({
      to: t.to,
      labelKey: t.labelKey,
      requiresReason: t.reverse === true,
    }));
  }

  async history(ctx: AuthContext, projectId: string) {
    const project = await this.get(ctx, projectId);
    return this.prisma.tenant.projectStatusHistory.findMany({
      where: { projectId: project.id, organizationId: ctx.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fromStatus: true, toStatus: true, actorId: true, reason: true, createdAt: true },
    });
  }

  /**
   * Rôles projet affectés, après avoir vérifié que l'acteur peut agir : un rôle interne non-ADMIN
   * doit être affecté au projet AVEC son rôle courant.
   */
  private assertCanAct(
    ctx: AuthContext,
    assignments: { role: Role; user: { id: string } }[],
  ): Role[] {
    if (requiresAssignmentAs(ctx.role) && !assignments.some((a) => a.user.id === ctx.userId && a.role === ctx.role)) {
      throw forbidden();
    }
    return [...new Set(assignments.map((a) => a.role))];
  }

  // --- Affectations -------------------------------------------------------------------------

  async assign(ctx: AuthContext, projectId: string, input: CreateAssignmentInput) {
    const project = await this.get(ctx, projectId);
    if (!ASSIGNABLE_ROLES.includes(input.role)) {
      throw new AppError('UNPROCESSABLE', 'Ce rôle ne s’affecte pas à un projet');
    }
    const user = await this.prisma.tenant.user.findFirst({
      where: { id: input.userId, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!user) throw notFound('Utilisateur');
    if (user.role !== input.role) {
      throw new AppError('UNPROCESSABLE', 'Le rôle affecté doit correspondre au rôle de l’utilisateur');
    }
    try {
      const assignment = await this.prisma.tenant.projectAssignment.create({
        data: {
          organizationId: ctx.organizationId,
          projectId: project.id,
          userId: user.id,
          role: input.role,
          assignedById: ctx.userId,
        },
        select: ASSIGNMENT_VIEW,
      });
      await this.audit.record(ctx, {
        action: 'project.assign',
        targetType: 'project',
        targetId: project.id,
        projectId: project.id,
        details: { userId: user.id, role: input.role },
      });
      return assignment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('CONFLICT', 'Cet utilisateur est déjà affecté avec ce rôle');
      }
      throw error;
    }
  }

  async unassign(ctx: AuthContext, projectId: string, assignmentId: string): Promise<void> {
    const project = await this.get(ctx, projectId);
    const removed = await this.prisma.tenant.projectAssignment.deleteMany({
      where: { id: assignmentId, projectId: project.id, organizationId: ctx.organizationId },
    });
    if (removed.count === 0) throw notFound('Affectation');
    await this.audit.record(ctx, {
      action: 'project.unassign',
      targetType: 'project',
      targetId: project.id,
      projectId: project.id,
      details: { assignmentId },
    });
  }
}
