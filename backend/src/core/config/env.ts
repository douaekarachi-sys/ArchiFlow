import { z } from 'zod';

/**
 * Variables d'environnement, validées au démarrage : une configuration invalide arrête le
 * processus immédiatement plutôt que de produire une erreur obscure à la première requête.
 * Aucune valeur secrète n'a de défaut.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET doit contenir au moins 32 caracteres'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    APP_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
    MAIL_TRANSPORT: z.enum(['file', 'memory', 'disabled']).default('disabled'),
    MAIL_DIR: z.string().default('.dev-mailbox'),
    THROTTLE_AUTH_LIMIT: z.coerce.number().int().positive().default(10),
    THROTTLE_AUTH_TTL_MS: z.coerce.number().int().positive().default(60_000),
    BACKUP_DIR: z.string().optional(),
    BACKUP_MAX_AGE_HOURS: z.coerce.number().positive().default(26),
  })
  .superRefine((env, ctx) => {
    // En production, un coût bcrypt affaibli ou un transport « memory » serait une faute.
    if (env.NODE_ENV === 'production' && env.BCRYPT_ROUNDS < 12) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['BCRYPT_ROUNDS'], message: 'minimum 12 en production' });
    }
    if (env.NODE_ENV === 'production' && env.MAIL_TRANSPORT === 'memory') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MAIL_TRANSPORT'], message: 'interdit en production' });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    // Les noms de variables sont listés, jamais leurs valeurs.
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')} : ${i.message}`).join('\n');
    throw new Error(`Configuration invalide :\n${problems}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');
