import { z } from 'zod';
import { EQUIPMENT_CATEGORIES } from '../architecture/document.schema.js';

/**
 * Schemas du catalogue (EF-201, EF-505), definis une seule fois (ADR 0002). Les colonnes qui
 * alimentent les moteurs de calcul (ports, debit, PoE, dimensions) restent typees ici — pas de
 * champ libre pour ce qui doit etre calculable.
 */

export const createManufacturerSchema = z.object({
  name: z.string().trim().min(1, 'validation.name.required').max(120),
  website: z.string().trim().url('validation.website.invalid').max(200).optional().or(z.literal('')),
});
export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;

export const createBrandSchema = z.object({
  manufacturerId: z.string().uuid(),
  name: z.string().trim().min(1, 'validation.name.required').max(120),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

/** Positifs uniquement, jamais negatifs — une puissance ou un nombre de ports negatif est une erreur de saisie. */
const positiveInt = z.coerce.number().int().min(0).max(1_000_000);

export const createEquipmentModelSchema = z.object({
  brandId: z.string().uuid(),
  categoryCode: z.enum(EQUIPMENT_CATEGORIES),
  name: z.string().trim().min(1, 'validation.name.required').max(160),
  reference: z.string().trim().min(1, 'validation.reference.required').max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  portCount: positiveInt.optional(),
  portType: z.string().trim().max(40).optional().or(z.literal('')),
  throughputMbps: positiveInt.optional(),
  poeBudgetW: positiveInt.optional(),
  powerDrawW: positiveInt.optional(),
  rackUnits: positiveInt.optional(),
  indicativePrice: z.coerce.number().min(0).max(100_000_000).optional(),
  currency: z.string().trim().length(3).optional().or(z.literal('')),
  licenseInfo: z.string().trim().max(500).optional().or(z.literal('')),
  /** Jamais presente comme reelle (brief §3, Phase 3) : le seed la pose systematiquement. */
  isDemoData: z.boolean().optional(),
});
export type CreateEquipmentModelInput = z.infer<typeof createEquipmentModelSchema>;

export const updateEquipmentModelSchema = createEquipmentModelSchema
  .omit({ brandId: true, categoryCode: true })
  .partial();
export type UpdateEquipmentModelInput = z.infer<typeof updateEquipmentModelSchema>;
