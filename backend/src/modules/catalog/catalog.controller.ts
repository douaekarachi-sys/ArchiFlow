import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { paginationSchema } from '../../common/http/pagination';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import type { AuthContext } from '@archiflow/shared';
import { CatalogService } from './catalog.service';

const listQuery = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
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
}
