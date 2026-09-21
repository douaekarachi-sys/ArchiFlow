import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  PROJECT_STATUSES,
  createAssignmentSchema,
  createRequestSchema,
  createShareSchema,
  transitionRequestSchema,
  type AuthContext,
  type CreateAssignmentInput,
  type CreateRequestInput,
  type CreateShareInput,
  type TransitionRequestInput,
} from '@archiflow/shared';
import { z } from 'zod';
import { paginationSchema } from '../../common/http/pagination';
import { uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { ProjectsService } from './projects.service';

const listQuery = paginationSchema.extend({
  status: z.enum(PROJECT_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
});

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermission('project.read')
  list(@CurrentUser() ctx: AuthContext, @Query(zod(listQuery)) q: z.infer<typeof listQuery>) {
    const { page, pageSize, ...filter } = q;
    return this.projects.list(ctx, filter, { page, pageSize });
  }

  @Post()
  @RequirePermission('project.create')
  create(@CurrentUser() ctx: AuthContext, @Body(zod(createRequestSchema)) input: CreateRequestInput) {
    return this.projects.create(ctx, input);
  }

  @Get(':id')
  @RequirePermission('project.read')
  get(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.projects.get(ctx, id);
  }

  @Get(':id/transitions')
  @RequirePermission('project.read')
  available(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.projects.available(ctx, id);
  }

  @Post(':id/transitions')
  @HttpCode(200)
  @RequirePermission('project.transition')
  transition(
    @CurrentUser() ctx: AuthContext,
    @Param('id', uuidParam) id: string,
    @Body(zod(transitionRequestSchema)) input: TransitionRequestInput,
  ) {
    return this.projects.applyTransition(ctx, id, input);
  }

  @Get(':id/history')
  @RequirePermission('project.read')
  history(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.projects.history(ctx, id);
  }

  @Post(':id/assignments')
  @RequirePermission('project.assign')
  assign(
    @CurrentUser() ctx: AuthContext,
    @Param('id', uuidParam) id: string,
    @Body(zod(createAssignmentSchema)) input: CreateAssignmentInput,
  ) {
    return this.projects.assign(ctx, id, input);
  }

  @Delete(':id/assignments/:assignmentId')
  @HttpCode(204)
  @RequirePermission('project.assign')
  unassign(
    @CurrentUser() ctx: AuthContext,
    @Param('id', uuidParam) id: string,
    @Param('assignmentId', uuidParam) assignmentId: string,
  ): Promise<void> {
    return this.projects.unassign(ctx, id, assignmentId);
  }

  @Post(':id/shares')
  @RequirePermission('project.share')
  share(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Body(zod(createShareSchema)) input: CreateShareInput) {
    return this.projects.share(ctx, id, input);
  }

  @Delete(':id/shares/:shareId')
  @HttpCode(204)
  @RequirePermission('project.share')
  unshare(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Param('shareId', uuidParam) shareId: string): Promise<void> {
    return this.projects.unshare(ctx, id, shareId);
  }
}
