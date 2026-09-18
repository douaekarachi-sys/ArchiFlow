import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppError, type ErrorCode } from '../errors/app-error';

interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

/**
 * Filtre unique : toute erreur sort sous la même enveloppe. Une erreur inattendue ne divulgue
 * jamais sa pile ni son message interne au client ; elle est journalisée côté serveur.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const [status, body] = this.toResponse(exception);
    res.status(status).json(body);
  }

  private toResponse(exception: unknown): [number, ErrorBody] {
    if (exception instanceof AppError) {
      return [exception.status, { error: { code: exception.code, message: exception.message, details: exception.details } }];
    }
    if (exception instanceof ThrottlerException) {
      return [429, { error: { code: 'RATE_LIMITED', message: 'Trop de tentatives, réessayez dans une minute' } }];
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = STATUS_TO_CODE[status] ?? (status >= 500 ? 'INTERNAL' : 'UNPROCESSABLE');
      const message = status === HttpStatus.NOT_FOUND ? 'Ressource introuvable' : exception.message;
      return [status, { error: { code, message } }];
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return [500, { error: { code: 'INTERNAL', message: 'Erreur interne' } }];
  }
}
