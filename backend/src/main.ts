import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { ENV, type Env } from './core/config/env';

async function bootstrap(): Promise<void> {
  // Le fichier .env vit à la racine du dépôt ; en production, l'environnement est fourni par l'hôte.
  const rootEnv = resolve(__dirname, '..', '..', '.env');
  if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const env = app.get<Env>(ENV);
  configureApp(app, env);
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  new Logger('Bootstrap').log(`API ArchiFlow à l'écoute sur le port ${env.PORT} (${env.NODE_ENV})`);
}

void bootstrap();
