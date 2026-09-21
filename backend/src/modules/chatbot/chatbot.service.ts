import { Inject, Injectable } from '@nestjs/common';
import { answerLocally, EMPTY_NEED, type AuthContext, type ChatAnswer, type RequestNeed } from '@archiflow/shared';
import { ENV, type Env } from '../../core/config/env';
import { AuditService } from '../audit/audit.service';
import { ProjectsService } from '../projects/projects.service';

/**
 * AIService (T9) : abstraction de fournisseur. Le moteur LOCAL (packages/shared, sans réseau)
 * est le mode PAR DÉFAUT — l'application doit être démontrable sans Internet. Un fournisseur LLM
 * externe est une implémentation alternative, choisie via AI_PROVIDER_API_KEY ; désactivée si la
 * clé est absente (elle l'est toujours dans cet environnement de démonstration).
 *
 * Le chatbot ne décide jamais seul : il conseille, et transmet à l'équipe technique quand il ne
 * sait pas répondre (`escalate`, journalisé dans l'audit — ENF-07).
 */
@Injectable()
export class ChatbotService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async answer(ctx: AuthContext, projectId: string, message: string): Promise<ChatAnswer> {
    const project = await this.projects.get(ctx, projectId);
    const need = project.request ? toRequestNeed(project.request) : null;

    if (this.env.AI_PROVIDER_API_KEY) {
      // Fournisseur externe : abstraction prête, aucune clé réelle disponible dans cet
      // environnement — le repli local reste la réponse d'autorité tant qu'aucun fournisseur
      // n'est réellement branché. Voir ADR 0018.
      return answerLocally(message, need);
    }
    return answerLocally(message, need);
  }

  async escalate(ctx: AuthContext, projectId: string, message: string): Promise<{ escalated: true }> {
    await this.projects.get(ctx, projectId);
    await this.audit.record(ctx, {
      action: 'chat.escalated',
      targetType: 'project',
      targetId: projectId,
      projectId,
      details: { message },
    });
    return { escalated: true };
  }
}

interface ProjectRequestRow {
  location: string | null;
  projectType: string | null;
  siteCount: number | null;
  totalEmployees: number | null;
  workstationCount: number | null;
  concurrentUsers: number | null;
  serverCount: number | null;
  wifi: boolean | null;
  buildings: { name: string; areaM2: number | null; floors: number | null; description: string | null }[];
  departments: { name: string; employees: number | null; workstations: number | null; location: string | null; notes: string | null }[];
}

/** Traduit la ligne Prisma (aplatie) vers RequestNeed — seuls les champs lus par le moteur local. */
function toRequestNeed(row: ProjectRequestRow): RequestNeed {
  return {
    ...EMPTY_NEED,
    location: row.location,
    projectType: row.projectType as RequestNeed['projectType'],
    siteCount: row.siteCount,
    totalEmployees: row.totalEmployees,
    workstationCount: row.workstationCount,
    concurrentUsers: row.concurrentUsers,
    serverCount: row.serverCount,
    wifi: row.wifi,
    buildings: row.buildings.map((b) => ({ name: b.name, areaM2: b.areaM2, floors: b.floors, description: b.description })),
    departments: row.departments.map((d) => ({ name: d.name, employees: d.employees, workstations: d.workstations, location: d.location, notes: d.notes })),
  };
}
