import { z } from 'zod';

export const createClientCompanySchema = z.object({
  name: z.string().trim().min(2, 'validation.name.required').max(120),
  city: z.string().trim().max(80).optional(),
  /** Code pays ISO 3166-1 alpha-2 (ex. « MA »). */
  country: z
    .string()
    .trim()
    .length(2, 'validation.country.length')
    .transform((v) => v.toUpperCase())
    .optional(),
});
export type CreateClientCompanyInput = z.infer<typeof createClientCompanySchema>;

export const updateClientCompanySchema = createClientCompanySchema.partial();
export type UpdateClientCompanyInput = z.infer<typeof updateClientCompanySchema>;
