import { Controller, Get, Param } from '@nestjs/common';
import type { AuthContext } from '@archiflow/shared';
import { uuidParam } from '../../common/pipes/params';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { ArchitectureService } from './architecture.service';

/** BOM et coûts (EF-302, EF-303) — dérivés de l'architecture, jamais saisis à la main. */
@Controller('projects/:id/bom')
export class BomController {
  constructor(private readonly architecture: ArchitectureService) {}

  @Get()
  @RequirePermission('bom.read')
  get(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.architecture.getBom(ctx, id);
  }
}
