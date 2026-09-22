import { Body, Controller, Get, HttpCode, Injectable, Module, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import {
  createClientCompanySchema,
  updateClientCompanySchema,
  type AuthContext,
  type CreateClientCompanyInput,
  type UpdateClientCompanyInput,
} from '@archiflow/shared';
import { z } from 'zod';
import { AppError, notFound } from '../../common/errors/app-error';
import { uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { Audited, AuditInterceptor } from '../audit/audited';

const SELECT = { id: true, name: true, city: true, country: true, deletedAt: true } satisfies Prisma.ClientCompanySelect;

const listQuery = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

/** Sociétés clientes : entités DANS le locataire (ADR 0006). Archivage, jamais de suppression (D-13). */
@Injectable()
export class ClientCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: AuthContext, includeArchived: boolean) {
    return this.prisma.tenant.clientCompany.findMany({
      where: { organizationId: ctx.organizationId, ...(includeArchived ? {} : { deletedAt: null }) },
      orderBy: { name: 'asc' },
      select: SELECT,
    });
  }

  async create(ctx: AuthContext, input: CreateClientCompanyInput) {
    try {
      return await this.prisma.tenant.clientCompany.create({
        data: { organizationId: ctx.organizationId, ...input },
        select: SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('CONFLICT', 'Une société cliente porte déjà ce nom');
      }
      throw error;
    }
  }

  async update(ctx: AuthContext, id: string, input: UpdateClientCompanyInput) {
    await this.findOne(ctx, id);
    try {
      return await this.prisma.tenant.clientCompany.update({
        where: { id, organizationId: ctx.organizationId },
        data: input,
        select: SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('CONFLICT', 'Une société cliente porte déjà ce nom');
      }
      throw error;
    }
  }

  /** Archivage, jamais de suppression (ADR 0008 — même principe que le catalogue). */
  async archive(ctx: AuthContext, id: string) {
    const company = await this.findOne(ctx, id);
    return this.prisma.tenant.clientCompany.update({
      where: { id: company.id, organizationId: ctx.organizationId },
      data: { deletedAt: company.deletedAt ?? new Date() },
      select: SELECT,
    });
  }

  private async findOne(ctx: AuthContext, id: string) {
    const company = await this.prisma.tenant.clientCompany.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: SELECT,
    });
    if (!company) throw notFound('Société cliente');
    return company;
  }
}

@Controller('client-companies')
export class ClientCompaniesController {
  constructor(private readonly companies: ClientCompaniesService) {}

  @Get()
  @RequirePermission('clientCompany.read')
  list(@CurrentUser() ctx: AuthContext, @Query(zod(listQuery)) q: z.infer<typeof listQuery>) {
    return this.companies.list(ctx, q.includeArchived ?? false);
  }

  @Post()
  @RequirePermission('clientCompany.manage')
  @UseInterceptors(AuditInterceptor)
  @Audited({ action: 'clientCompany.create', targetType: 'clientCompany' })
  create(@CurrentUser() ctx: AuthContext, @Body(zod(createClientCompanySchema)) input: CreateClientCompanyInput) {
    return this.companies.create(ctx, input);
  }

  @Patch(':id')
  @RequirePermission('clientCompany.manage')
  @UseInterceptors(AuditInterceptor)
  @Audited({ action: 'clientCompany.update', targetType: 'clientCompany' })
  update(
    @CurrentUser() ctx: AuthContext,
    @Param('id', uuidParam) id: string,
    @Body(zod(updateClientCompanySchema)) input: UpdateClientCompanyInput,
  ) {
    return this.companies.update(ctx, id, input);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermission('clientCompany.manage')
  @UseInterceptors(AuditInterceptor)
  @Audited({ action: 'clientCompany.archive', targetType: 'clientCompany' })
  archive(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.companies.archive(ctx, id);
  }
}

@Module({
  controllers: [ClientCompaniesController],
  providers: [ClientCompaniesService],
})
export class ClientCompaniesModule {}
