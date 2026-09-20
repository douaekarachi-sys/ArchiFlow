import { z } from 'zod';
import { AppError } from '../errors/app-error';
import { ZodValidationPipe } from './zod-validation.pipe';

/**
 * Identifiant de route. Un identifiant mal formé répond 404, comme un identifiant inconnu :
 * la forme d'une erreur ne doit rien apprendre à l'appelant.
 */
class UuidParamPipe extends ZodValidationPipe<string> {
  constructor() {
    super(z.string().uuid());
  }

  override transform(value: unknown): string {
    try {
      return super.transform(value);
    } catch {
      throw new AppError('NOT_FOUND', 'Ressource introuvable');
    }
  }
}

export const uuidParam = new UuidParamPipe();

/** Numéro de version : un numéro mal formé répond 404, même logique que `uuidParam`. */
class PositiveIntParamPipe extends ZodValidationPipe<number> {
  constructor() {
    super(z.coerce.number().int().min(0));
  }

  override transform(value: unknown): number {
    try {
      return super.transform(value);
    } catch {
      throw new AppError('NOT_FOUND', 'Ressource introuvable');
    }
  }
}

export const positiveIntParam = new PositiveIntParamPipe();
