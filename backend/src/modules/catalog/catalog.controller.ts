import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  createBrandSchema,
  createEquipmentModelSchema,
  createManufacturerSchema,
  updateEquipmentModelSchema,
  type AuthContext,
  type CreateBrandInput,
  type CreateEquipmentModelInput,
  type CreateManufacturerInput,
  type UpdateEquipmentModelInput,
} from '@archiflow/shared';
import { z } from 'zod';
import { paginationSchema } from '../../common/http/pagination';
import { uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { CatalogService } from './catalog.service';

const listQuery = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('equipment')
  @RequirePermission('catalog.read')
  list(@CurrentUser() ctx: AuthContext, @Query(zod(listQuery)) query: z.infer<typeof listQuery>) {
    const { page, pageSize, ...filter } = query;
    return this.catalog.list(ctx, filter, { page, pageSize });
  }

  @Post('equipment')
  @RequirePermission('catalog.manage')
  createModel(@CurrentUser() ctx: AuthContext, @Body(zod(createEquipmentModelSchema)) input: CreateEquipmentModelInput) {
    return this.catalog.createModel(ctx, input);
  }

  @Patch('equipment/:id')
  @RequirePermission('catalog.manage')
  updateModel(
    @CurrentUser() ctx: AuthContext,
    @Param('id', uuidParam) id: string,
    @Body(zod(updateEquipmentModelSchema)) input: UpdateEquipmentModelInput,
  ) {
    return this.catalog.updateModel(ctx, id, input);
  }

  /** Archivage, jamais de suppression (ADR 0008). */
  @Post('equipment/:id/archive')
  @HttpCode(200)
  @RequirePermission('catalog.manage')
  archiveModel(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.catalog.archiveModel(ctx, id);
  }

  @Get('manufacturers')
  @RequirePermission('catalog.read')
  listManufacturers(@CurrentUser() ctx: AuthContext) {
    return this.catalog.listManufacturers(ctx);
  }

  @Post('manufacturers')
  @RequirePermission('catalog.manage')
  createManufacturer(@CurrentUser() ctx: AuthContext, @Body(zod(createManufacturerSchema)) input: CreateManufacturerInput) {
    return this.catalog.createManufacturer(ctx, input);
  }

  @Post('brands')
  @RequirePermission('catalog.manage')
  createBrand(@CurrentUser() ctx: AuthContext, @Body(zod(createBrandSchema)) input: CreateBrandInput) {
    return this.catalog.createBrand(ctx, input);
  }
}
