import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { ENV, type Env } from '../../src/core/config/env';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { Mailer } from '../../src/modules/mail/mailer';

export interface TestApp {
  app: INestApplication;
  http: TestAgent;
  prisma: PrismaService;
  mailer: Mailer;
  close(): Promise<void>;
}

/** Application complète, gardes, filtres et configuration HTTP compris. */
export async function createTestApp(overrides: Record<string, string> = {}): Promise<TestApp> {
  const saved = { ...process.env };
  Object.assign(process.env, overrides);
  try {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, app.get<Env>(ENV));
    await app.init();
    return {
      app,
      http: request.agent(app.getHttpServer()),
      prisma: app.get(PrismaService),
      mailer: app.get(Mailer),
      close: () => app.close(),
    };
  } finally {
    process.env = saved;
  }
}

export const API = '/api/v1';
