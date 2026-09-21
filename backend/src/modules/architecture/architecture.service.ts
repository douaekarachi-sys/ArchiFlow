import { Injectable } from '@nestjs/common';
import {
  buildBom,
  diffArchitecture,
  validateArchitecture,
  type ArchitectureDiff,
  type ArchitectureDocument,
  type AuthContext,
  type BillOfMaterials,
  type EquipmentIndex,
  type FrozenModelSpec,
} from '@archiflow/shared';
import { AppError, notFound } from '../../common/errors/app-error';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';

export interface ArchitectureVersionSummary {
  number: number;
  comment: string | null;
  restoredFromVersion: number | null;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string } | null;
}

// `networks` est OPTIONNEL dans le schéma (comme `placement`) : l'omettre ici, jamais `[]`, pour
// que les comparaisons `toEqual` face à un document sans plan d'adressage restent stables.
const EMPTY_DOCUMENT: ArchitectureDocument = { elements: [], connections: [], zones: [] };

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
    return this.readNormalizedTables(ctx.organizationId, architecture.id);
  }

  /**
   * Remplacement intégral du document (ADR 0003 : le client valide en local, une seule
   * sauvegarde traverse le réseau). Pas de diff granulaire — l'architecture d'un projet reste de
   * taille modeste, et la co-édition temps réel (EF-404) est explicitement hors périmètre V1.
   */
  async save(ctx: AuthContext, projectId: string, input: ArchitectureDocument): Promise<ArchitectureDocument> {
    return this.persist(ctx, projectId, input, null, undefined);
  }

  /**
   * EF-405 — historique des versions (comment/auteur), la plus récente d'abord. Le snapshot
   * complet n'est chargé qu'à la demande (`getVersion`) : il peut être volumineux.
   */
  async listVersions(ctx: AuthContext, projectId: string): Promise<ArchitectureVersionSummary[]> {
    await this.projects.get(ctx, projectId);
    const architecture = await this.prisma.tenant.architecture.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!architecture) return [];

    const versions = await this.prisma.tenant.architectureVersion.findMany({
      where: { architectureId: architecture.id, organizationId: ctx.organizationId },
      select: { number: true, comment: true, restoredFromVersion: true, createdAt: true, authorId: true },
      orderBy: { number: 'desc' },
    });
    const authorIds = [...new Set(versions.map((v) => v.authorId))];
    const authors = authorIds.length
      ? await this.prisma.system.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const authorById = new Map(authors.map((a) => [a.id, a]));

    return versions.map((v) => ({
      number: v.number,
      comment: v.comment,
      restoredFromVersion: v.restoredFromVersion,
      createdAt: v.createdAt,
      author: authorById.get(v.authorId) ?? null,
    }));
  }

  /** Snapshot complet et auto-porteur (ADR 0001) : caractéristiques et prix figés au moment du gel. */
  async getVersion(ctx: AuthContext, projectId: string, number: number): Promise<ArchitectureDocument> {
    const version = await this.findVersion(ctx, projectId, number);
    return version.snapshot as unknown as ArchitectureDocument;
  }

  /**
   * Comparaison sémantique entre deux versions (EF-405). `from = 0` compare contre un document
   * vide : « ce que la version N a apporté depuis le début ».
   */
  async diffVersions(ctx: AuthContext, projectId: string, from: number, to: number): Promise<ArchitectureDiff> {
    const fromDoc = from === 0 ? EMPTY_DOCUMENT : await this.getVersion(ctx, projectId, from);
    const toDoc = await this.getVersion(ctx, projectId, to);
    return diffArchitecture(fromDoc, toDoc);
  }

  /**
   * Restaurer NE réécrit jamais une version : elle rejoue la topologie historique comme une
   * nouvelle sauvegarde (revalidée contre le catalogue ACTUEL, figée avec les prix ACTUELS —
   * une restauration est un événement de sauvegarde comme un autre, D-01).
   */
  async restoreVersion(ctx: AuthContext, projectId: string, number: number): Promise<ArchitectureDocument> {
    const version = await this.findVersion(ctx, projectId, number);
    const snapshot = version.snapshot as unknown as ArchitectureDocument;
    const document: ArchitectureDocument = {
      ...snapshot,
      elements: snapshot.elements.map(({ frozenSpec: _frozenSpec, ...element }) => element),
    };
    return this.persist(ctx, projectId, document, number, `Restauration de la version ${number}`);
  }

  /**
   * BOM et coûts (EF-302, EF-303) : DÉRIVÉS de la dernière version sauvegardée, jamais saisis à
   * la main. Basé sur le snapshot figé (prix au moment de CETTE sauvegarde), pas le catalogue
   * courant — reproductible même si le catalogue a changé depuis (ADR 0001).
   */
  async getBom(ctx: AuthContext, projectId: string): Promise<BillOfMaterials> {
    await this.projects.get(ctx, projectId);
    const architecture = await this.prisma.tenant.architecture.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      select: { id: true, currentVersion: true },
    });
    if (!architecture || architecture.currentVersion === 0) return buildBom(EMPTY_DOCUMENT);
    const document = await this.getVersion(ctx, projectId, architecture.currentVersion);
    return buildBom(document);
  }

  private async findVersion(ctx: AuthContext, projectId: string, number: number) {
    await this.projects.get(ctx, projectId);
    const architecture = await this.prisma.tenant.architecture.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!architecture) throw notFound('Version');
    const version = await this.prisma.tenant.architectureVersion.findFirst({
      where: { architectureId: architecture.id, organizationId: ctx.organizationId, number },
    });
    if (!version) throw notFound('Version');
    return version;
  }

  private async readNormalizedTables(organizationId: string, architectureId: string): Promise<ArchitectureDocument> {
    const scoped = { architectureId, organizationId };
    const [elements, connections, zones, networks, buildings, floors, rooms, racks] = await Promise.all([
      this.prisma.tenant.architectureElement.findMany({ where: scoped, orderBy: { key: 'asc' } }),
      this.prisma.tenant.architectureConnection.findMany({ where: scoped, orderBy: { key: 'asc' } }),
      this.prisma.tenant.architectureZone.findMany({ where: scoped, include: { elements: { select: { key: true } } }, orderBy: { key: 'asc' } }),
      this.prisma.tenant.architectureNetwork.findMany({ where: scoped, orderBy: { key: 'asc' } }),
      this.prisma.tenant.architectureBuilding.findMany({ where: scoped, orderBy: { key: 'asc' } }),
      this.prisma.tenant.architectureFloor.findMany({ where: scoped, orderBy: { key: 'asc' } }),
      this.prisma.tenant.architectureRoom.findMany({ where: scoped, orderBy: { key: 'asc' } }),
      this.prisma.tenant.architectureRack.findMany({ where: scoped, orderBy: { key: 'asc' } }),
    ]);
    const keyByElementId = new Map(elements.map((e) => [e.id, e.key]));
    const keyByNetworkId = new Map(networks.map((n) => [n.id, n.key]));
    const keyByBuildingId = new Map(buildings.map((b) => [b.id, b.key]));
    const keyByFloorId = new Map(floors.map((f) => [f.id, f.key]));
    const keyByRoomId = new Map(rooms.map((r) => [r.id, r.key]));

    return {
      elements: elements.map((e) => ({
        id: e.key,
        type: e.type as ArchitectureDocument['elements'][number]['type'],
        equipmentModelId: e.equipmentModelId,
        label: e.label,
        position: { x: e.positionX, y: e.positionY },
        placement: (e.placement as ArchitectureDocument['elements'][number]['placement']) ?? undefined,
        networkId: e.networkId ? keyByNetworkId.get(e.networkId) : undefined,
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
      // `networks`/`buildings`/`floors`/`rooms`/`racks` sont optionnels (comme `placement`) :
      // omis, jamais `[]`, quand vides — un document sans plan d'adressage ou construction
      // physique reste comparable `toEqual` à l'ancien format.
      networks:
        networks.length > 0
          ? networks.map((n) => ({
              id: n.key,
              name: n.name,
              vlanId: n.vlanId,
              cidr: n.cidr,
              gateway: n.gateway ?? undefined,
              dhcpRangeStart: n.dhcpRangeStart ?? undefined,
              dhcpRangeEnd: n.dhcpRangeEnd ?? undefined,
            }))
          : undefined,
      buildings: buildings.length > 0 ? buildings.map((b) => ({ id: b.key, name: b.name })) : undefined,
      floors:
        floors.length > 0
          ? floors.map((f) => ({ id: f.key, buildingId: keyByBuildingId.get(f.buildingId) ?? f.buildingId, name: f.name }))
          : undefined,
      rooms: rooms.length > 0 ? rooms.map((r) => ({ id: r.key, floorId: keyByFloorId.get(r.floorId) ?? r.floorId, name: r.name })) : undefined,
      racks:
        racks.length > 0
          ? racks.map((r) => ({ id: r.key, roomId: keyByRoomId.get(r.roomId) ?? r.roomId, name: r.name, totalUnits: r.totalUnits }))
          : undefined,
    };
  }

  /**
   * Sauvegarde ET restauration passent par ce même chemin (D-01, consequence 2 : « sauvegarder
   * est une transaction unique »). Second volet de l'ADR 0003 : le serveur revalide avec le
   * catalogue EN BASE (jamais celui envoyé par le client) et FAIT AUTORITÉ — une anomalie
   * CRITICAL refuse l'écriture, y compris à la restauration.
   */
  private async persist(
    ctx: AuthContext,
    projectId: string,
    input: ArchitectureDocument,
    restoredFromVersion: number | null,
    comment: string | undefined,
  ): Promise<ArchitectureDocument> {
    await this.projects.get(ctx, projectId);

    const modelIds = [...new Set(input.elements.map((e) => e.equipmentModelId).filter((id): id is string => id != null))];
    const validationIndex: EquipmentIndex = {};
    const frozenSpecs = new Map<string, FrozenModelSpec>();
    if (modelIds.length > 0) {
      const found = await this.prisma.tenant.equipmentModel.findMany({
        where: { id: { in: modelIds }, organizationId: ctx.organizationId },
        select: { id: true, name: true, reference: true, portCount: true, portType: true, throughputMbps: true, poeBudgetW: true, powerDrawW: true, rackUnits: true, indicativePrice: true, currency: true, licenseAnnualCost: true },
      });
      if (found.length !== modelIds.length) throw notFound('Modèle d’équipement');
      for (const model of found) {
        validationIndex[model.id] = {
          portCount: model.portCount,
          portType: model.portType,
          throughputMbps: model.throughputMbps,
          poeBudgetW: model.poeBudgetW,
          powerDrawW: model.powerDrawW,
        };
        frozenSpecs.set(model.id, {
          name: model.name,
          reference: model.reference,
          portCount: model.portCount ?? undefined,
          throughputMbps: model.throughputMbps ?? undefined,
          rackUnits: model.rackUnits ?? undefined,
          poeBudgetW: model.poeBudgetW ?? undefined,
          powerDrawW: model.powerDrawW ?? undefined,
          indicativePrice: model.indicativePrice != null ? Number(model.indicativePrice) : undefined,
          currency: model.currency ?? undefined,
          licenseAnnualCost: model.licenseAnnualCost != null ? Number(model.licenseAnnualCost) : undefined,
        });
      }
    }

    const validation = validateArchitecture(input, validationIndex);
    if (!validation.compatible) {
      const critical = validation.anomalies.filter((a) => a.severity === 'CRITICAL');
      throw new AppError('ARCHITECTURE_INCOMPATIBLE', 'Architecture incompatible : anomalie critique détectée', { anomalies: critical });
    }

    const architecture = await this.getOrCreate(ctx, projectId);
    const nextNumber = architecture.currentVersion + 1;

    await this.prisma.tenant.$transaction(async (tx) => {
      const scoped = { architectureId: architecture.id, organizationId: ctx.organizationId };
      await tx.architectureConnection.deleteMany({ where: scoped });
      await tx.architectureZone.deleteMany({ where: scoped });
      await tx.architectureElement.deleteMany({ where: scoped });
      await tx.architectureNetwork.deleteMany({ where: scoped });
      // Construction physique : enfant avant parent (baie → salle → étage → bâtiment).
      await tx.architectureRack.deleteMany({ where: scoped });
      await tx.architectureRoom.deleteMany({ where: scoped });
      await tx.architectureFloor.deleteMany({ where: scoped });
      await tx.architectureBuilding.deleteMany({ where: scoped });

      const buildings = input.buildings ?? [];
      if (buildings.length > 0) {
        await tx.architectureBuilding.createMany({
          data: buildings.map((b) => ({ organizationId: ctx.organizationId, architectureId: architecture.id, key: b.id, name: b.name })),
        });
      }
      const buildingRows = await tx.architectureBuilding.findMany({ where: scoped, select: { id: true, key: true } });
      const buildingIdByKey = new Map(buildingRows.map((b) => [b.key, b.id]));

      const floors = input.floors ?? [];
      if (floors.length > 0) {
        await tx.architectureFloor.createMany({
          data: floors.map((f) => ({
            organizationId: ctx.organizationId,
            architectureId: architecture.id,
            key: f.id,
            // La cohérence buildingId est déjà garantie par architectureDocumentSchema (superRefine).
            buildingId: buildingIdByKey.get(f.buildingId)!,
            name: f.name,
          })),
        });
      }
      const floorRows = await tx.architectureFloor.findMany({ where: scoped, select: { id: true, key: true } });
      const floorIdByKey = new Map(floorRows.map((f) => [f.key, f.id]));

      const rooms = input.rooms ?? [];
      if (rooms.length > 0) {
        await tx.architectureRoom.createMany({
          data: rooms.map((r) => ({
            organizationId: ctx.organizationId,
            architectureId: architecture.id,
            key: r.id,
            floorId: floorIdByKey.get(r.floorId)!,
            name: r.name,
          })),
        });
      }
      const roomRows = await tx.architectureRoom.findMany({ where: scoped, select: { id: true, key: true } });
      const roomIdByKey = new Map(roomRows.map((r) => [r.key, r.id]));

      const racks = input.racks ?? [];
      if (racks.length > 0) {
        await tx.architectureRack.createMany({
          data: racks.map((r) => ({
            organizationId: ctx.organizationId,
            architectureId: architecture.id,
            key: r.id,
            roomId: roomIdByKey.get(r.roomId)!,
            name: r.name,
            totalUnits: r.totalUnits,
          })),
        });
      }

      const networks = input.networks ?? [];
      if (networks.length > 0) {
        await tx.architectureNetwork.createMany({
          data: networks.map((n) => ({
            organizationId: ctx.organizationId,
            architectureId: architecture.id,
            key: n.id,
            name: n.name,
            vlanId: n.vlanId,
            cidr: n.cidr,
            gateway: n.gateway ?? null,
            dhcpRangeStart: n.dhcpRangeStart ?? null,
            dhcpRangeEnd: n.dhcpRangeEnd ?? null,
          })),
        });
      }
      const networkRows = await tx.architectureNetwork.findMany({ where: scoped, select: { id: true, key: true } });
      const networkIdByKey = new Map(networkRows.map((n) => [n.key, n.id]));

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
            // La cohérence networkId est déjà garantie par architectureDocumentSchema (superRefine).
            networkId: el.networkId ? (networkIdByKey.get(el.networkId) ?? null) : null,
            config: el.config as Prisma.InputJsonValue,
          })),
        });
      }

      const elementRows = await tx.architectureElement.findMany({ where: scoped, select: { id: true, key: true } });
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

      // Snapshot auto-porteur (ADR 0001) : le document ET les caractéristiques/prix figés AU
      // MOMENT de cette sauvegarde — jamais seulement l'identifiant du modèle.
      const snapshot: ArchitectureDocument = {
        ...input,
        elements: input.elements.map((el) => ({
          ...el,
          frozenSpec: el.equipmentModelId ? frozenSpecs.get(el.equipmentModelId) : undefined,
        })),
      };
      await tx.architectureVersion.create({
        data: {
          organizationId: ctx.organizationId,
          architectureId: architecture.id,
          number: nextNumber,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          comment: comment ?? null,
          authorId: ctx.userId,
          restoredFromVersion,
        },
      });
      await tx.architecture.update({ where: { id: architecture.id, organizationId: ctx.organizationId }, data: { currentVersion: nextNumber } });
    });

    await this.audit.record(ctx, {
      action: restoredFromVersion != null ? 'architecture.restore' : 'architecture.save',
      targetType: 'architecture',
      targetId: architecture.id,
      projectId,
      details: { elements: input.elements.length, connections: input.connections.length, zones: input.zones.length, version: nextNumber, restoredFromVersion },
    });

    return input;
  }

  private async getOrCreate(ctx: AuthContext, projectId: string) {
    const existing = await this.prisma.tenant.architecture.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      select: { id: true, currentVersion: true },
    });
    if (existing) return existing;
    return this.prisma.tenant.architecture.create({
      data: { organizationId: ctx.organizationId, projectId },
      select: { id: true, currentVersion: true },
    });
  }
}
