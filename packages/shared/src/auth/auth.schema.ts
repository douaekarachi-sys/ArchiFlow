import { z } from 'zod';
import { ROLES } from '../rbac/roles';

/**
 * Schemas definis UNE SEULE FOIS ici (ADR 0002). Le frontend les utilise avec React Hook Form,
 * le backend avec un pipe Zod. Les types TypeScript en sont derives par z.infer : ils ne
 * peuvent pas diverger de la validation.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Adresse e-mail requise')
  .email('Adresse e-mail invalide')
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
  .max(128, 'Mot de passe trop long');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, 'Prenom requis').max(80),
  lastName: z.string().trim().min(1, 'Nom requis').max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ROLES),
  /** Obligatoire pour un CLIENT, interdit pour un role interne — verifie cote serveur. */
  clientCompanyId: z.string().uuid().optional().nullable(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const changeRoleSchema = z.object({
  role: z.enum(ROLES),
});
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

/** Profil renvoye au client apres authentification. Ne contient jamais de hash. */
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
  organizationId: z.string().uuid(),
  clientCompanyId: z.string().uuid().nullable(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const authResultSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  profile: userProfileSchema,
  /** Portail vers lequel rediriger (ROLE_HOME). */
  redirectTo: z.string(),
});
export type AuthResult = z.infer<typeof authResultSchema>;
