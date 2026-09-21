import { Injectable } from '@nestjs/common';
import { buildBom, EMPTY_DOCUMENT, type AuthContext } from '@archiflow/shared';
import { renderToBuffer } from '@react-pdf/renderer';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ArchitectureService } from '../architecture/architecture.service';
import { ProjectsService } from '../projects/projects.service';
import { ArchitectureReport } from './pdf-document';

/** Mêmes libellés que frontend/src/i18n/locales/fr.json (`status.*`) — le PDF ne parle jamais le jargon des enums. */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  PENDING_ASSIGNMENT: "En attente d'affectation",
  ASSIGNED: 'Équipe affectée',
  ENGINEERING: 'Dimensionnement',
  ARCHITECTURE: 'Conception',
  INTERNAL_REVIEW: 'Revue interne',
  COMMERCIAL_REVIEW: 'Chiffrage',
  CLIENT_REVIEW: 'Proposition client',
  CLIENT_COMMENTS: 'Commentaires client',
  REVISION: 'Révision',
  CLIENT_APPROVED: 'Validé par le client',
  COMPLETED: 'Terminé',
};

/** Export PDF (EF-301) — dérivé du même document que le designer 2D (ADR 0001), jamais un second modèle. */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly architecture: ArchitectureService,
  ) {}

  async generateArchitecturePdf(ctx: AuthContext, projectId: string): Promise<Buffer> {
    const project = await this.projects.get(ctx, projectId);
    const org = await this.prisma.system.organization.findUniqueOrThrow({
      where: { id: ctx.organizationId },
      select: { name: true },
    });

    const architectureRow = await this.prisma.tenant.architecture.findFirst({
      where: { projectId, organizationId: ctx.organizationId },
      select: { currentVersion: true },
    });
    const document =
      architectureRow && architectureRow.currentVersion > 0
        ? await this.architecture.getVersion(ctx, projectId, architectureRow.currentVersion)
        : EMPTY_DOCUMENT;
    const bom = buildBom(document);

    return renderToBuffer(
      ArchitectureReport({
        organizationName: org.name,
        project: {
          name: project.name,
          description: project.description,
          status: STATUS_LABELS[project.status] ?? project.status,
          clientCompanyName: project.clientCompany.name,
        },
        document,
        bom,
        generatedAt: new Date(),
      }),
    );
  }
}
