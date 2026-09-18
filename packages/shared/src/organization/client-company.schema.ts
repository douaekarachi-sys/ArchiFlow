import { z } from 'zod';

export const createClientCompanySchema = z.object({
  name: z.string().trim().min(2, 'Nom requis').max(120),
  city: z.string().trim().max(80).optional(),
  /** Code pays ISO 3166-1 alpha-2 (ex. « MA »). */
  country: z
    .string()
    .trim()
    .length(2, 'Code pays sur deux lettres')
    .transform((v) => v.toUpperCase())
    .optional(),
});
export type CreateClientCompanyInput = z.infer<typeof createClientCompanySchema>;
