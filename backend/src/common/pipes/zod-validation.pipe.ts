import { Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';
import { AppError } from '../errors/app-error';

/**
 * Validation des entrées par les schémas Zod de packages/shared (ADR 0002) : le serveur applique
 * exactement la règle que le formulaire a appliquée, et fait autorité.
 * Les champs inconnus sont retirés par Zod : un `role` glissé dans un corps de requête disparaît.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError(
        'VALIDATION_FAILED',
        'Données invalides',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    return result.data;
  }
}

export const zod = <T>(schema: ZodType<T, ZodTypeDef, unknown>) => new ZodValidationPipe(schema);
