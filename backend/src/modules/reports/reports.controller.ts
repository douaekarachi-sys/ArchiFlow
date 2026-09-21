import { Controller, Get, Param, Res } from '@nestjs/common';
import type { AuthContext } from '@archiflow/shared';
import type { Response } from 'express';
import { uuidParam } from '../../common/pipes/params';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { ReportsService } from './reports.service';

/** Export PDF (EF-301) — informations client, schéma logique, équipements, BOM, coûts. */
@Controller('projects/:id/report')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('pdf')
  @RequirePermission('bom.read')
  async pdf(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Res() res: Response) {
    const buffer = await this.reports.generateArchitecturePdf(ctx, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="architecture-${id}.pdf"`);
    res.send(buffer);
  }
}
