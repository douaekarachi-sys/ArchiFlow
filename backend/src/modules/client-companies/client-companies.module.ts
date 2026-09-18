import { Body, Controller, Get, Injectable, Module, Post, UseInterceptors } from '@nestjs/common';
import {
  createClientCompanySchema,
  type AuthContext,
  type CreateClientCompanyInput,
} from '@archiflow/shared';
import { AppError } from '../../common/errors/app-error';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { Audited, AuditInterceptor } from '../audit/audited';

/**
 * Sociétés clientes : entités DANS le locataire (ADR 0006). Phase 1 : le minimum nécessaire à la
 * création des comptes CLIENT et des projets. L'écran d'administration complet vient en Phase 3.
 */
@Injectable()
export class ClientCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: AuthContext) {
    return this.prisma.tenant.clientCompany.findMany({
      where: { organizationId: ctx.organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, city: true, country: true },
    });
  }

  async create(ctx: AuthContext, input: CreateClientCompanyInput) {
    try {
      return await this.prisma.tenant.clientCompany.create({
        data: { organizationId: ctx.organizationId, ...input },
        select: { id: true, name: true, city: true, country: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('CONFLICT', 'Une société cliente porte déjà ce nom');
      }
      throw error;
    }
  }
}

@Controller('client-companies')
export class ClientCompaniesController {
  constructor(private readonly companies: ClientCompaniesService) {}

  @Get()
  @RequirePermission('clientCompany.read')
  list(@CurrentUser() ctx: AuthContext) {
    return this.companies.list(ctx);
  }

  @Post()
  @RequirePermission('clientCompany.manage')
  @UseInterceptors(AuditInterceptor)
  @Audited({ action: 'clientCompany.create', targetType: 'clientCompany' })
  create(@CurrentUser() ctx: AuthContext, @Body(zod(createClientCompanySchema)) input: CreateClientCompanyInput) {
    return this.companies.create(ctx, input);
  }
}

@Module({
  controllers: [ClientCompaniesController],
  providers: [ClientCompaniesService],
})
export class ClientCompaniesModule {}
