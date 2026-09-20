import { Injectable } from '@nestjs/common';
import { EMPTY_DOCUMENT, type ArchitectureDocument, type AuthContext } from '@archiflow/shared';
import { notFound } from '../../common/errors/app-error';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ArchitectureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly projects: ProjectsService,
  ) {}

  /**
   * Lecture seule : une architecture jamais sauvegardée n'existe pas encore en base, le document
   * vide est un état légitime, pas une erreur.
   */
  async get(ctx: AuthContext, projectId: string): Promise<ArchitectureDocument> {
    await this.projects.get(ctx, projectId);
    const architecture = await this.prisma.tenant.architecture.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!architecture) return EMPTY_DOCUMENT;

    const scoped = { architectureId: architecture.id, organizationId: ctx.organizationId };
    const [elements, connections, zones] = await Promise.all([
      this.prisma.tenant.architectureElement.findMany({
        where: scoped,
        orderBy: { key: 'asc' },
      }),
      this.prisma.tenant.architectureConnection.findMany({
        where: scoped,
        orderBy: { key: 'asc' },
      }),
      this.prisma.tenant.architectureZone.findMany({
        where: scoped,
        include: { elements: { select: { key: true } } },
        orderBy: { key: 'asc' },
      }),
    ]);

    const keyByElementId = new Map(elements.map((e) => [e.id, e.key]));

    return {
      elements: elements.map((e) => ({
        id: e.key,
        type: e.type as ArchitectureDocument['elements'][number]['type'],
        equipmentModelId: e.equipmentModelId,
        label: e.label,
        position: { x: e.positionX, y: e.positionY },
        placement: (e.placement as ArchitectureDocument['elements'][number]['placement']) ?? undefined,
        config: (e.config as Record<string, unknown>) ?? {},
      })),
      connections: connections.map((c) => ({
        id: c.key,
        from: keyByElementId.get(c.fromElementId) ?? c.fromElementId,
        to: keyByElementId.get(c.toElementId) ?? c.toElementId,
        fromPort: c.fromPort ?? undefined,
        toPort: c.toPort ?? undefined,
        linkType: c.linkType,
        speedMbps: c.speedMbps ?? undefined,
        protocol: c.protocol ?? undefined,
      })),
      zones: zones.map((z) => ({
        id: z.key,
        type: z.type,
        label: z.label ?? undefined,
        elementIds: z.elements.map((e) => e.key),
      })),
    };
  }

  /**
   * Remplacement intégral du document (ADR 0003 : le client valide en local, une seule
   * sauvegarde traverse le réseau). Pas de diff granulaire — l'architecture d'un projet reste de
   * taille modeste, et la co-édition temps réel (EF-404) est explicitement hors périmètre V1.
   */
  async save(ctx: AuthContext, projectId: string, input: ArchitectureDocument): Promise<ArchitectureDocument> {
    await this.projects.get(ctx, projectId);

    const modelIds = [...new Set(input.elements.map((e) => e.equipmentModelId).filter((id): id is string => id != null))];
    if (modelIds.length > 0) {
      const found = await this.prisma.tenant.equipmentModel.findMany({
        where: { id: { in: modelIds }, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (found.length !== modelIds.length) throw notFound('Modèle d’équipement');
    }

    const architecture = await this.getOrCreate(ctx, projectId);

    await this.prisma.tenant.$transaction(async (tx) => {
      const scoped = { architectureId: architecture.id, organizationId: ctx.organizationId };
      await tx.architectureConnection.deleteMany({ where: scoped });
      await tx.architectureZone.deleteMany({ where: scoped });
      await tx.architectureElement.deleteMany({ where: scoped });

      if (input.elements.length > 0) {
        await tx.architectureElement.createMany({
          data: input.elements.map((el) => ({
            organizationId: ctx.organizationId,
            architectureId: architecture.id,
            key: el.id,
            type: el.type,
            equipmentModelId: el.equipmentModelId,
            label: el.label,
            positionX: el.position.x,
            positionY: el.position.y,
            placement: el.placement ? (el.placement as Prisma.InputJsonValue) : Prisma.JsonNull,
            config: el.config as Prisma.InputJsonValue,
          })),
        });
      }

      const elementRows = await tx.architectureElement.findMany({
        where: scoped,
        select: { id: true, key: true },
      });
      const idByKey = new Map(elementRows.map((e) => [e.key, e.id]));

      if (input.connections.length > 0) {
        await tx.architectureConnection.createMany({
          data: input.connections.map((c) => ({
            organizationId: ctx.organizationId,
            architectureId: architecture.id,
            key: c.id,
            // La cohérence from/to est déjà garantie par architectureDocumentSchema (superRefine).
            fromElementId: idByKey.get(c.from)!,
            toElementId: idByKey.get(c.to)!,
            fromPort: c.fromPort ?? null,
            toPort: c.toPort ?? null,
            linkType: c.linkType,
            speedMbps: c.speedMbps ?? null,
            protocol: c.protocol ?? null,
          })),
        });
      }

      for (const zone of input.zones) {
        await tx.architectureZone.create({
          data: {
            organizationId: ctx.organizationId,
            architectureId: architecture.id,
            key: zone.id,
            type: zone.type,
            label: zone.label ?? null,
            elements: { connect: zone.elementIds.map((elementId) => ({ id: idByKey.get(elementId)! })) },
          },
        });
      }
    });

    await this.audit.record(ctx, {
      action: 'architecture.save',
      targetType: 'architecture',
      targetId: architecture.id,
      projectId,
      details: { elements: input.elements.length, connections: input.connections.length, zones: input.zones.length },
    });

    return input;
  }

  private async getOrCreate(ctx: AuthContext, projectId: string) {
    const existing = await this.prisma.tenant.architecture.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (existing) return existing;
    return this.prisma.tenant.architecture.create({
      data: { organizationId: ctx.organizationId, projectId },
      select: { id: true },
    });
  }
}
