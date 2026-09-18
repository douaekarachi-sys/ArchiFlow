import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ROLES,
  changeRoleSchema,
  createUserSchema,
  type AuthContext,
  type ChangeRoleInput,
  type CreateUserInput,
} from '@archiflow/shared';
import { z } from 'zod';
import { paginationSchema } from '../../common/http/pagination';
import { uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { UsersService } from './users.service';

const listQuery = paginationSchema.extend({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(80).optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('user.read')
  list(@CurrentUser() ctx: AuthContext, @Query(zod(listQuery)) q: z.infer<typeof listQuery>) {
    const { page, pageSize, ...filter } = q;
    return this.users.list(ctx, filter, { page, pageSize });
  }

  /** 202 et corps identique, que l'adresse soit libre ou non (ADR 0010). */
  @Post()
  @HttpCode(202)
  @RequirePermission('user.create')
  create(@CurrentUser() ctx: AuthContext, @Body(zod(createUserSchema)) input: CreateUserInput) {
    return this.users.create(ctx, input);
  }

  @Patch(':id/role')
  @RequirePermission('user.changeRole')
  changeRole(
    @CurrentUser() ctx: AuthContext,
    @Param('id', uuidParam) id: string,
    @Body(zod(changeRoleSchema)) input: ChangeRoleInput,
  ) {
    return this.users.changeRole(ctx, id, input.role);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @RequirePermission('user.deactivate')
  deactivate(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.users.deactivate(ctx, id);
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  @RequirePermission('user.deactivate')
  reactivate(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.users.reactivate(ctx, id);
  }

  @Post(':id/anonymize')
  @HttpCode(200)
  @RequirePermission('user.deactivate')
  anonymize(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.users.anonymize(ctx, id);
  }
}
