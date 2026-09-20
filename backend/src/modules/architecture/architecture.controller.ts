import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { architectureDocumentSchema, type ArchitectureDocument, type AuthContext } from '@archiflow/shared';
import { z } from 'zod';
import { positiveIntParam, uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { ArchitectureService } from './architecture.service';

const diffQuerySchema = z.object({
  from: z.coerce.number().int().min(0),
  to: z.coerce.number().int().min(1),
});

@Controller('projects/:id/architecture')
export class ArchitectureController {
  constructor(private readonly architecture: ArchitectureService) {}

  @Get()
  @RequirePermission('architecture.read')
  get(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.architecture.get(ctx, id);
  }

  @Put()
  @RequirePermission('architecture.edit')
  save(
    @CurrentUser() ctx: AuthContext,
    @Param('id', uuidParam) id: string,
    @Body(zod(architectureDocumentSchema)) input: ArchitectureDocument,
  ) {
    return this.architecture.save(ctx, id, input);
  }

  @Get('versions')
  @RequirePermission('architecture.read')
  listVersions(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.architecture.listVersions(ctx, id);
  }

  @Get('versions/diff')
  @RequirePermission('architecture.read')
  diffVersions(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Query(zod(diffQuerySchema)) query: z.infer<typeof diffQuerySchema>) {
    return this.architecture.diffVersions(ctx, id, query.from, query.to);
  }

  @Get('versions/:number')
  @RequirePermission('architecture.read')
  getVersion(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Param('number', positiveIntParam) number: number) {
    return this.architecture.getVersion(ctx, id, number);
  }

  @Post('versions/:number/restore')
  @RequirePermission('architecture.edit')
  restoreVersion(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Param('number', positiveIntParam) number: number) {
    return this.architecture.restoreVersion(ctx, id, number);
  }
}
