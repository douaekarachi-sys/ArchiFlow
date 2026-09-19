import { Injectable } from '@nestjs/common';
import type { AuthContext } from '@archiflow/shared';
import { skipTake, toPage, type Page, type Pagination } from '../../common/http/pagination';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

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
  brand: { select: { id: true, name: true, manufacturer: { select: { id: true, name: true } } } },
  category: { select: { id: true, code: true, labelKey: true } },
} satisfies Prisma.EquipmentModelSelect;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ctx: AuthContext, filter: { q?: string; category?: string }, pagination: Pagination): Promise<Page<unknown>> {
    const where: Prisma.EquipmentModelWhereInput = {
      organizationId: ctx.organizationId,
      archivedAt: null,
      ...(filter.category ? { category: { code: filter.category } } : {}),
      ...(filter.q ? {
        OR: [
          { name: { contains: filter.q, mode: 'insensitive' } },
          { reference: { contains: filter.q, mode: 'insensitive' } },
          { brand: { name: { contains: filter.q, mode: 'insensitive' } } },
          { brand: { manufacturer: { name: { contains: filter.q, mode: 'insensitive' } } } },
        ],
      } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.tenant.equipmentModel.findMany({ where, select: EQUIPMENT_VIEW, orderBy: [{ name: 'asc' }], ...skipTake(pagination) }),
      this.prisma.tenant.equipmentModel.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }
}
