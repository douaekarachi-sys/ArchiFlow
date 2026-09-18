import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import type { Env } from './core/config/env';

export const API_PREFIX = 'api/v1';

/**
 * Configuration HTTP commune au serveur et aux tests d'intégration : les tests exercent
 * exactement les mêmes en-têtes, le même préfixe et le même CORS que la production.
 */
export function configureApp(app: INestApplication, env: Env): void {
  const express = app as NestExpressApplication;
  express.setGlobalPrefix(API_PREFIX);
  express.set('trust proxy', 1);
  express.disable('x-powered-by');

  if (env.NODE_ENV === 'production') {
    // TLS obligatoire (ENF-02) : derrière le reverse proxy, toute requête HTTP est redirigée.
    express.use((req: Request, res: Response, next: NextFunction) => {
      if (req.secure) return next();
      res.redirect(308, `https://${req.headers.host ?? ''}${req.originalUrl}`);
    });
  }

  express.use(
    helmet({
      // HSTS : un an, sous-domaines compris (ENF-02).
      strictTransportSecurity: { maxAge: 31_536_000, includeSubDomains: true },
    }),
  );
  express.use(cookieParser());
  express.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  });
  express.useBodyParser('json', { limit: '2mb' });
}
