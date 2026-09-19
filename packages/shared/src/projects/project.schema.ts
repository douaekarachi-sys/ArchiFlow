import { z } from 'zod';
import { ROLES } from '../rbac/roles.js';
import { PROJECT_STATUSES } from '../workflow/project-state-machine.js';

export const createProjectSchema = z.object({
  name: z.string().trim().min(3, 'validation.projectName.required').max(120),
  description: z.string().trim().max(2000).optional(),
  clientCompanyId: z.string().uuid('validation.clientCompany.required'),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

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
