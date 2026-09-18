import { Controller, Get, Query } from '@nestjs/common';
import type { AuthContext } from '@archiflow/shared';
import { z } from 'zod';
import { paginationSchema } from '../../common/http/pagination';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { AuditService } from './audit.service';

const querySchema = paginationSchema.extend({
  action: z.string().max(80).optional(),
  projectId: z.string().uuid().optional(),
});

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission('audit.read')
  list(@CurrentUser() ctx: AuthContext, @Query(zod(querySchema)) q: z.infer<typeof querySchema>) {
    const { page, pageSize, ...filter } = q;
    return this.audit.list(ctx, filter, { page, pageSize });
  }
}
