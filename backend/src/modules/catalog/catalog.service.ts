import { Injectable } from '@nestjs/common';
import type {
  AuthContext,
  CreateBrandInput,
  CreateEquipmentModelInput,
  CreateManufacturerInput,
  UpdateEquipmentModelInput,
} from '@archiflow/shared';
import { notFound } from '../../common/errors/app-error';
import { skipTake, toPage, type Page, type Pagination } from '../../common/http/pagination';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';

const EQUIPMENT_VIEW = {
  id: true,
  name: true,
  reference: true,
  description: true,
  portCount: true,
  portType: true,
  throughputMbps: true,
  poeBudgetW: true,
  powerDrawW: true,
  rackUnits: true,
  indicativePrice: true,
  currency: true,
  licenseInfo: true,
  availability: true,
  imageUrl: true,
  isDemoData: true,
  archivedAt: true,
  brand: { select: { id: true, name: true, manufacturer: { select: { id: true, name: true } } } },
  category: { select: { id: true, code: true, labelKey: true } },
} satisfies Prisma.EquipmentModelSelect;

const MANUFACTURER_VIEW = {
  id: true,
  name: true,
  website: true,
  brands: { select: { id: true, name: true } },
} satisfies Prisma.EquipmentManufacturerSelect;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Consultation (EF-201) — tous les rôles internes -------------------------------------

  async list(
    ctx: AuthContext,
    filter: { q?: string; category?: string; includeArchived?: boolean },
    pagination: Pagination,
  ): Promise<Page<unknown>> {
    const where: Prisma.EquipmentModelWhereInput = {
      organizationId: ctx.organizationId,
      ...(filter.includeArchived ? {} : { archivedAt: null }),
      ...(filter.category ? { category: { code: filter.category } } : {}),
      ...(filter.q
        ? {
            OR: [
              { name: { contains: filter.q, mode: 'insensitive' } },
              { reference: { contains: filter.q, mode: 'insensitive' } },
              { brand: { name: { contains: filter.q, mode: 'insensitive' } } },
              { brand: { manufacturer: { name: { contains: filter.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.tenant.equipmentModel.findMany({ where, select: EQUIPMENT_VIEW, orderBy: [{ name: 'asc' }], ...skipTake(pagination) }),
      this.prisma.tenant.equipmentModel.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  async listManufacturers(ctx: AuthContext) {
    return this.prisma.tenant.equipmentManufacturer.findMany({
      where: { organizationId: ctx.organizationId },
      select: MANUFACTURER_VIEW,
      orderBy: { name: 'asc' },
    });
  }

  // --- Administration (EF-505) — catalog.manage uniquement ---------------------------------

  /** Idempotent par nom : retaper un fabricant déjà présent le réutilise, sans doublon. */
  async createManufacturer(ctx: AuthContext, input: CreateManufacturerInput) {
    const existing = await this.prisma.tenant.equipmentManufacturer.findFirst({
      where: { organizationId: ctx.organizationId, name: input.name },
      select: MANUFACTURER_VIEW,
    });
    if (existing) return existing;

    const manufacturer = await this.prisma.tenant.equipmentManufacturer.create({
      data: { organizationId: ctx.organizationId, name: input.name, website: input.website || null },
      select: MANUFACTURER_VIEW,
    });
    await this.audit.record(ctx, { action: 'catalog.manufacturer.created', targetType: 'equipmentManufacturer', targetId: manufacturer.id });
    return manufacturer;
  }

  /** Idempotent par nom, sous le même fabricant. */
  async createBrand(ctx: AuthContext, input: CreateBrandInput) {
    const manufacturer = await this.prisma.tenant.equipmentManufacturer.findFirst({
      where: { id: input.manufacturerId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!manufacturer) throw notFound('Fabricant');

    const existing = await this.prisma.tenant.equipmentBrand.findFirst({
      where: { organizationId: ctx.organizationId, manufacturerId: manufacturer.id, name: input.name },
      select: { id: true, name: true, manufacturerId: true },
    });
    if (existing) return existing;

    const brand = await this.prisma.tenant.equipmentBrand.create({
      data: { organizationId: ctx.organizationId, manufacturerId: manufacturer.id, name: input.name },
      select: { id: true, name: true, manufacturerId: true },
    });
    await this.audit.record(ctx, { action: 'catalog.brand.created', targetType: 'equipmentBrand', targetId: brand.id });
    return brand;
  }

  async createModel(ctx: AuthContext, input: CreateEquipmentModelInput) {
    const [brand, category] = await Promise.all([
      this.prisma.tenant.equipmentBrand.findFirst({
        where: { id: input.brandId, organizationId: ctx.organizationId },
        select: { id: true },
      }),
      this.prisma.system.equipmentCategory.findUnique({ where: { code: input.categoryCode }, select: { id: true } }),
    ]);
    if (!brand) throw notFound('Marque');
    if (!category) throw notFound('Catégorie');

    const model = await this.prisma.tenant.equipmentModel.create({
      data: {
        organizationId: ctx.organizationId,
        brandId: brand.id,
        categoryId: category.id,
        name: input.name,
        reference: input.reference,
        description: input.description || null,
        portCount: input.portCount,
        portType: input.portType || null,
        throughputMbps: input.throughputMbps,
        poeBudgetW: input.poeBudgetW,
        powerDrawW: input.powerDrawW,
        rackUnits: input.rackUnits,
        indicativePrice: input.indicativePrice,
        currency: input.currency || null,
        licenseInfo: input.licenseInfo || null,
        isDemoData: input.isDemoData ?? false,
      },
      select: EQUIPMENT_VIEW,
    });
    await this.audit.record(ctx, { action: 'catalog.model.created', targetType: 'equipmentModel', targetId: model.id });
    return model;
  }

  async updateModel(ctx: AuthContext, modelId: string, input: UpdateEquipmentModelInput) {
    await this.findModelInOrganization(ctx, modelId);
    const model = await this.prisma.tenant.equipmentModel.update({
      where: { id: modelId, organizationId: ctx.organizationId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.portCount !== undefined ? { portCount: input.portCount } : {}),
        ...(input.portType !== undefined ? { portType: input.portType || null } : {}),
        ...(input.throughputMbps !== undefined ? { throughputMbps: input.throughputMbps } : {}),
        ...(input.poeBudgetW !== undefined ? { poeBudgetW: input.poeBudgetW } : {}),
        ...(input.powerDrawW !== undefined ? { powerDrawW: input.powerDrawW } : {}),
        ...(input.rackUnits !== undefined ? { rackUnits: input.rackUnits } : {}),
        ...(input.indicativePrice !== undefined ? { indicativePrice: input.indicativePrice } : {}),
        ...(input.currency !== undefined ? { currency: input.currency || null } : {}),
        ...(input.licenseInfo !== undefined ? { licenseInfo: input.licenseInfo || null } : {}),
      },
      select: EQUIPMENT_VIEW,
    });
    await this.audit.record(ctx, { action: 'catalog.model.updated', targetType: 'equipmentModel', targetId: model.id });
    return model;
  }

  /** Archivage, jamais de suppression (ADR 0008) : le modèle reste lisible, plus ajoutable. */
  async archiveModel(ctx: AuthContext, modelId: string) {
    const existing = await this.findModelInOrganization(ctx, modelId);
    if (existing.archivedAt) return existing;
    const model = await this.prisma.tenant.equipmentModel.update({
      where: { id: modelId, organizationId: ctx.organizationId },
      data: { archivedAt: new Date() },
      select: EQUIPMENT_VIEW,
    });
    await this.audit.record(ctx, { action: 'catalog.model.archived', targetType: 'equipmentModel', targetId: model.id });
    return model;
  }

  private async findModelInOrganization(ctx: AuthContext, modelId: string) {
    const model = await this.prisma.tenant.equipmentModel.findFirst({
      where: { id: modelId, organizationId: ctx.organizationId },
      select: EQUIPMENT_VIEW,
    });
    if (!model) throw notFound('Modèle');
    return model;
  }
}
