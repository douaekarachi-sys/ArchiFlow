import { HttpStatus } from '@nestjs/common';

/**
 * Codes d'erreur stables. Le frontend les traduit (ENF-03) ; le `message` n'est qu'un repli
 * lisible en français, jamais affiché tel quel quand une traduction existe.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  SESSION_EXPIRED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  PASSWORD_CHANGE_REQUIRED: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  TRANSITION_REFUSED: HttpStatus.CONFLICT,
  UNPROCESSABLE: HttpStatus.UNPROCESSABLE_ENTITY,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  get status(): number {
    return ERROR_CODES[this.code];
  }
}

/** Message unique des diagrammes : ne révèle jamais lequel, du compte ou du mot de passe, est faux. */
export const invalidCredentials = () => new AppError('INVALID_CREDENTIALS', 'Identifiants incorrects');

/** Refus de permission, libellé du diagramme de séquence « API gestion des comptes ». */
export const forbidden = () => new AppError('FORBIDDEN', 'Permissions insuffisantes');

/**
 * Ressource hors de portée OU inexistante : 404 dans les deux cas. Un 403 confirmerait
 * l'existence d'une ressource d'un autre locataire (ADR 0006).
 */
export const notFound = (what = 'Ressource') => new AppError('NOT_FOUND', `${what} introuvable`);
