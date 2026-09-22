import { Body, Controller, Get, Injectable, Module, Param, Post } from '@nestjs/common';
import { createCommentSchema, type AuthContext, type CreateCommentInput } from '@archiflow/shared';
import { uuidParam } from '../../common/pipes/params';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CurrentUser, RequirePermission } from '../../security/decorators';
import { AuditService } from '../audit/audit.service';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectsService } from '../projects/projects.service';

export interface CommentView {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string; role: string } | null;
}

/**
 * Messages (T17, point 1) — UN SEUL nouveau modèle explicitement justifié : un fil de
 * commentaires partagé entre le client et l'équipe interne, par projet. Pas de temps réel,
 * pas de pièces jointes, pas de mentions (hors périmètre demandé).
 */
@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly projects: ProjectsService,
  ) {}

  /** La visibilité du projet (D-09, y compris CLIENT restreint à sa société) fait autorité. */
  async list(ctx: AuthContext, projectId: string): Promise<CommentView[]> {
    await this.projects.get(ctx, projectId);
    const comments = await this.prisma.tenant.projectComment.findMany({
      where: { projectId, organizationId: ctx.organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, body: true, createdAt: true, authorId: true },
    });
    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const authors = authorIds.length
      ? await this.prisma.system.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstName: true, lastName: true, role: true } })
      : [];
    const authorById = new Map(authors.map((a) => [a.id, a]));
    return comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt, author: authorById.get(c.authorId) ?? null }));
  }

  async create(ctx: AuthContext, projectId: string, input: CreateCommentInput): Promise<CommentView> {
    await this.projects.get(ctx, projectId);
    const comment = await this.prisma.tenant.projectComment.create({
      data: { organizationId: ctx.organizationId, projectId, authorId: ctx.userId, body: input.body },
      select: { id: true, body: true, createdAt: true, authorId: true },
    });
    await this.audit.record(ctx, { action: 'comment.create', targetType: 'comment', targetId: comment.id, projectId });
    const author = await this.prisma.system.user.findUnique({ where: { id: ctx.userId }, select: { id: true, firstName: true, lastName: true, role: true } });
    return { id: comment.id, body: comment.body, createdAt: comment.createdAt, author: author ?? null };
  }
}

@Controller('projects/:id/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @RequirePermission('project.read')
  list(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string) {
    return this.comments.list(ctx, id);
  }

  @Post()
  @RequirePermission('comment.create')
  create(@CurrentUser() ctx: AuthContext, @Param('id', uuidParam) id: string, @Body(zod(createCommentSchema)) input: CreateCommentInput) {
    return this.comments.create(ctx, id, input);
  }
}

@Module({
  imports: [ProjectsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
