import { z } from 'zod';
import { ROLES } from '../rbac/roles.js';
import { PROJECT_STATUSES } from '../workflow/project-state-machine.js';

export const createProjectSchema = z.object({
  name: z.string().trim().min(3, 'validation.projectName.required').max(120),
  description: z.string().trim().max(2000).optional(),
  clientCompanyId: z.string().uuid('validation.clientCompany.required'),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Échéance indicative (Planning, T16) — jamais imposée, purement informative ; `null` la retire. */
export const updateProjectSchema = z.object({
  dueDate: z.coerce.date().nullish(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** applyTransition : le statut cible et, pour un retour en arrière, son motif (ADR 0005). */
export const transitionRequestSchema = z.object({
  to: z.enum(PROJECT_STATUSES),
  reason: z.string().trim().max(1000).optional(),
});
export type TransitionRequestInput = z.infer<typeof transitionRequestSchema>;

export const createAssignmentSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLES),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

/**
 * Partage d'un projet (EF-401, EF-402) : un droit borné, distinct de l'affectation par rôle
 * projet (`ProjectAssignment`) — un utilisateur de l'organisation, quel que soit son rôle, peut
 * être invité sur un projet précis avec lecture, commentaire ou édition. Jamais de lien public.
 */
export const PROJECT_SHARE_RIGHTS = ['READ', 'COMMENT', 'EDIT'] as const;
export type ProjectShareRight = (typeof PROJECT_SHARE_RIGHTS)[number];

export const createShareSchema = z.object({
  userId: z.string().uuid(),
  right: z.enum(PROJECT_SHARE_RIGHTS),
});
export type CreateShareInput = z.infer<typeof createShareSchema>;

/** Messages (T17, point 1) — un fil de commentaires partagé entre le client et l'équipe interne. */
export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'validation.comment.required').max(4000, 'validation.comment.tooLong'),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
