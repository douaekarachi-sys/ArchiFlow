import { z } from 'zod';
import { ROLES, isInternalRole } from '../rbac/roles.js';

/**
 * Schemas definis UNE SEULE FOIS ici (ADR 0002). Le frontend les utilise avec React Hook Form,
 * le backend avec un pipe Zod. Les types TypeScript en sont derives par z.infer : ils ne
 * peuvent pas diverger de la validation.
 *
 * Le jeton de rafraichissement n'apparait dans AUCUN schema : il circule exclusivement dans un
 * cookie httpOnly, illisible par le JavaScript de la page (ARCHITECTURE-CIBLE §6.7).
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'validation.email.required')
  .email('validation.email.invalid')
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(12, 'validation.password.tooShort')
  .max(128, 'validation.password.tooLong');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'validation.password.required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Creation d'un compte par l'administrateur (ADR 0010) — il n'existe pas d'inscription publique.
 * Le mot de passe est provisoire : l'utilisateur doit le changer a sa premiere connexion.
 */
export const createUserSchema = z
  .object({
    firstName: z.string().trim().min(1, 'validation.firstName.required').max(80),
    lastName: z.string().trim().min(1, 'validation.lastName.required').max(80),
    email: emailSchema,
    temporaryPassword: passwordSchema,
    role: z.enum(ROLES),
    /** Obligatoire pour un CLIENT, interdit pour un role interne. */
    clientCompanyId: z.string().uuid().nullish(),
  })
  .superRefine((input, ctx) => {
    const internal = isInternalRole(input.role);
    if (!internal && !input.clientCompanyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clientCompanyId'],
        message: 'validation.clientCompany.required',
      });
    }
    if (internal && input.clientCompanyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clientCompanyId'],
        message: 'validation.clientCompany.forbidden',
      });
    }
  });
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Reponse a une creation de compte : IDENTIQUE que l'adresse soit libre ou deja utilisee
 * (anti-enumeration, ADR 0010). Aucun identifiant n'y figure, puisqu'il n'existerait que dans
 * l'un des deux cas.
 */
export const createUserAcceptedSchema = z.object({
  status: z.literal('accepted'),
});
export type CreateUserAccepted = z.infer<typeof createUserAcceptedSchema>;

export const changeRoleSchema = z.object({
  role: z.enum(ROLES),
});
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.password.currentRequired').max(128),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'validation.password.mustDiffer',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Profil renvoye au client apres authentification. Ne contient jamais de hash. */
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
  organizationId: z.string().uuid(),
  clientCompanyId: z.string().uuid().nullable(),
  /** Vrai tant que le mot de passe provisoire n'a pas ete change (ADR 0010). */
  mustChangePassword: z.boolean(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * Corps de reponse de /auth/login et /auth/refresh. Le jeton de rafraichissement est pose en
 * cookie httpOnly par le serveur ; il n'est volontairement PAS dans ce schema.
 */
export const authResultSchema = z.object({
  accessToken: z.string(),
  profile: userProfileSchema,
  /** Portail vers lequel rediriger (ROLE_HOME), ou l'ecran de changement de mot de passe. */
  redirectTo: z.string(),
});
export type AuthResult = z.infer<typeof authResultSchema>;
