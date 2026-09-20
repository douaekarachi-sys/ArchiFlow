import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { architectureDocumentSchema, type ArchitectureDocument, type AuthContext } from '@archiflow/shared';
import { uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { ArchitectureService } from './architecture.service';

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
}
